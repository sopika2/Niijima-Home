/**
 * What the search box does with what you typed: open it as an address, hand a DuckDuckGo
 * !bang on to DuckDuckGo, or search for it with your engine. The browser runs this on submit (no
 * round trip), and /search runs the same code when JavaScript is off.
 */

export const ENGINES = {
	duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={q}' },
	google: { name: 'Google', url: 'https://www.google.com/search?q={q}' },
	startpage: { name: 'Startpage', url: 'https://www.startpage.com/sp/search?query={q}' },
	kagi: { name: 'Kagi', url: 'https://kagi.com/search?q={q}' }
} as const;

export type EngineId = keyof typeof ENGINES;

export interface SearchSettings {
	/** Where a search goes, with {q} where the words belong. */
	readonly template: string;
	/** Send "!w tokyo" and the like to DuckDuckGo, which knows the bangs. */
	readonly bangs: boolean;
}

export type SearchTarget =
	| { readonly kind: 'address'; readonly url: string }
	| { readonly kind: 'bang'; readonly url: string }
	| { readonly kind: 'search'; readonly url: string };

const BANG_URL = 'https://duckduckgo.com/?q={q}';

/** A bang is "!" and a word, at the start or end of the query or between spaces: "!w tokyo". */
const BANG = /(?:^|\s)![\p{L}\p{N}_.-]+(?=\s|$)/u;

/**
 * Top-level domains that make "word.tld" an address rather than a search. Every country code,
 * the old generic ones and the newer ones people actually use. "node.js" stays a search; a
 * domain with an unusual ending still opens when it has a path or port ("site.foo/page").
 */
const TLDS = new Set(
	// Generic, old and new.
	(
		'com net org edu gov mil int info biz name pro mobi aero coop museum jobs travel tel asia cat post ' +
		'app dev page blog cloud online site store shop tech xyz top club fun games game live news art ' +
		'design studio space website email network systems wiki zone link click digital media social ' +
		'agency company solutions services moe ninja guru rocks photo photos pics video tube music film ' +
		'movie radio software codes tools academy school university education help support finance ' +
		'money bank insurance health care life love world earth city town global one plus run work ' +
		'today day events chat forum community center house home host hosting domains dns ' +
		'computer download stream blue red pink black gold green land beer wine ' +
		'coffee cafe restaurant food recipes kitchen style fashion shoes clothing jewelry watch ' +
		'berlin wien tokyo nyc london paris amsterdam bayern hamburg ' +
		// Local networks and Tor.
		'local lan internal arpa onion ' +
		// Country codes (ISO 3166-1, plus eu, uk, su, ac).
		'ac ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bm bn bo br bs bt ' +
		'bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg er ' +
		'es et eu fi fj fk fm fo fr ga gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht ' +
		'hu id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ' +
		'ls lt lu lv ly ma mc md me mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ' +
		'ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd ' +
		'se sg sh si sk sl sm sn so sr ss st su sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw ' +
		'tz ua ug uk us uy uz va vc ve vg vi vn vu wf ws ye yt za zm zw'
	).split(/\s+/)
);

/** Endings that never have https: home servers and the like. */
const PLAIN_HTTP = new Set(['local', 'lan', 'internal', 'arpa']);

const LABEL = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?$/u;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** The search URL for some words. */
export function fill(template: string, words: string): string {
	return template.replaceAll('{q}', encodeURIComponent(words));
}

/**
 * The address in what was typed, or null when it isn't one. "example.com", "example.com/path",
 * "http://…", "localhost:5173", "192.168.1.10" and "nas:5000" are addresses; "node.js",
 * "hello world" and "mailto:x" are not.
 */
export function addressOf(text: string): string | null {
	if (/\s/.test(text)) return null;
	if (/^https?:\/\//i.test(text)) return parse(text);
	if (/^[a-z][a-z\d+.-]*:\/\//i.test(text)) return null; // ftp://, file://: not ours to open

	const match = /^([^/?#]+)([/?#].*)?$/u.exec(text);
	if (!match) return null;
	const [, authority, rest] = match as unknown as [string, string, string | undefined];
	if (authority.includes('@')) return null; // an email address, or user:pass@ (never wanted)

	const hostPort = /^(.+?)(?::(\d{1,5}))?$/.exec(authority);
	if (!hostPort) return null;
	const host = hostPort[1]!.toLowerCase();
	const port = hostPort[2];
	if (port !== undefined && (Number(port) < 1 || Number(port) > 65535)) return null;
	const extra = port !== undefined || rest !== undefined;

	let scheme = 'https';
	const ip = IPV4.exec(host);
	if (ip) {
		if (ip.slice(1).some((part) => Number(part) > 255)) return null;
		scheme = 'http';
	} else if (host === 'localhost') {
		scheme = 'http';
	} else {
		const labels = host.split('.');
		if (!labels.every((label) => LABEL.test(label))) return null;
		if (labels.length === 1) {
			// "nas:5000" is a machine on the home network; a lone word is a search.
			if (port === undefined) return null;
			scheme = 'http';
		} else {
			const tld = labels.at(-1)!;
			if (!/^(?:\p{L}{2,63}|xn--[a-z\d-]+)$/u.test(tld)) return null;
			if (!TLDS.has(tld) && !tld.startsWith('xn--') && !extra) return null;
			if (PLAIN_HTTP.has(tld)) scheme = 'http';
		}
	}
	return parse(`${scheme}://${text}`);
}

function parse(text: string): string | null {
	try {
		const url = new URL(text);
		return url.hostname ? url.href : null;
	} catch {
		return null;
	}
}

/**
 * Where to go for what was typed, or null for nothing (an empty box). A leading "?" always
 * searches, the way Firefox's address bar does: "? node.js".
 */
export function searchTarget(input: string, settings: SearchSettings): SearchTarget | null {
	const text = input.trim();
	if (!text) return null;

	if (text.startsWith('?')) {
		const words = text.slice(1).trim();
		return words ? { kind: 'search', url: fill(settings.template, words) } : null;
	}
	if (settings.bangs && BANG.test(text)) return { kind: 'bang', url: fill(BANG_URL, text) };

	const address = addressOf(text);
	if (address) return { kind: 'address', url: address };
	return { kind: 'search', url: fill(settings.template, text) };
}
