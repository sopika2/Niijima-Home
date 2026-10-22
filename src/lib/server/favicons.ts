import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Your links' own icons, fetched by the server and kept on disk (data/icons), so the browser
 * never talks to those sites just to draw the page. The page only shows icons that are already
 * here; a missing one gets a letter tile and is fetched in the background for next time.
 */

const TYPES = {
	png: 'image/png',
	ico: 'image/x-icon',
	svg: 'image/svg+xml',
	gif: 'image/gif',
	webp: 'image/webp',
	jpg: 'image/jpeg'
} as const;
type Ext = keyof typeof TYPES;

const REFRESH_AFTER = 30 * 86_400_000; // refetch a good icon after a month
const RETRY_AFTER = 3 * 86_400_000; // try a site without an icon again after three days
const TIMEOUT = 5_000;
const MAX_HTML = 300_000;
const MAX_ICON = 512_000;
const PARALLEL = 4;
const USER_AGENT = 'Mozilla/5.0 (compatible; NiijimaHome/1.0; icon fetch)';

interface Known {
	readonly ext: Ext | null;
	readonly at: number;
}

/** Host names are already safe file names ([a-z0-9.-]); anything else is refused. */
const SAFE_HOST = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/;

export class Favicons {
	readonly #dir: string;
	readonly #log: (message: string) => void;
	#index: Map<string, Known> | null = null;
	readonly #wanted = new Map<string, string>(); // host → page to look at
	#running = 0;

	constructor(dir: string, log: (message: string) => void = () => {}) {
		this.#dir = dir;
		this.#log = log;
	}

	#known(): Map<string, Known> {
		if (this.#index) return this.#index;
		this.#index = new Map();
		try {
			mkdirSync(this.#dir, { recursive: true });
			for (const name of readdirSync(this.#dir)) {
				const match = /^(.+)\.(png|ico|svg|gif|webp|jpg|none)$/.exec(name);
				if (!match) continue;
				const at = statSync(join(this.#dir, name)).mtimeMs;
				const ext = match[2] === 'none' ? null : (match[2] as Ext);
				const before = this.#index.get(match[1]!);
				if (!before || before.at < at) this.#index.set(match[1]!, { ext, at });
			}
		} catch (error) {
			this.#log(`can't use ${this.#dir}: ${error instanceof Error ? error.message : error}`);
		}
		return this.#index;
	}

	/**
	 * Whether an icon for this link's site is on disk. When there is none yet (or it's old), a
	 * fetch starts in the background; this never waits for it.
	 */
	has(url: string): boolean {
		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			return false;
		}
		const host = parsed.hostname.toLowerCase();
		if (!SAFE_HOST.test(host)) return false;
		const known = this.#known().get(host);
		const age = known ? Date.now() - known.at : Infinity;
		if (!known || (known.ext ? age > REFRESH_AFTER : age > RETRY_AFTER)) {
			this.#want(host, `${parsed.protocol}//${parsed.host}/`);
		}
		return Boolean(known?.ext);
	}

	/** The icon file for a host, for the /icon route. */
	async read(host: string): Promise<{ body: Buffer; type: string } | null> {
		if (!SAFE_HOST.test(host)) return null;
		const known = this.#known().get(host);
		if (!known?.ext) return null;
		try {
			return {
				body: await readFile(join(this.#dir, `${host}.${known.ext}`)),
				type: TYPES[known.ext]
			};
		} catch {
			return null;
		}
	}

	#want(host: string, page: string): void {
		if (this.#wanted.has(host)) return;
		this.#wanted.set(host, page);
		this.#pump();
	}

	#pump(): void {
		while (this.#running < PARALLEL) {
			const next = [...this.#wanted].find(([, page]) => page !== '');
			if (!next) return;
			const [host, page] = next;
			this.#wanted.set(host, ''); // in progress
			this.#running += 1;
			this.#fetch(host, page)
				.catch((error: unknown) =>
					this.#log(`${host}: ${error instanceof Error ? error.message : error}`)
				)
				.finally(() => {
					this.#running -= 1;
					this.#wanted.delete(host);
					this.#pump();
				});
		}
	}

	async #fetch(host: string, page: string): Promise<void> {
		let candidates = [new URL('/favicon.ico', page).href];
		try {
			const html = await download(page, MAX_HTML, 'text/html');
			if (html) candidates = iconCandidates(html.body.toString('utf8'), html.url);
		} catch {
			// No page to read: just try /favicon.ico.
		}
		for (const candidate of candidates) {
			try {
				const file = await download(candidate, MAX_ICON, 'image/*');
				const ext = file && sniff(file.body);
				if (!file || !ext) continue;
				await this.#store(host, ext, file.body);
				return;
			} catch {
				// Try the next one.
			}
		}
		await this.#store(host, null, Buffer.alloc(0));
		this.#log(`${host}: no icon found; showing a letter tile`);
	}

	async #store(host: string, ext: Ext | null, body: Buffer): Promise<void> {
		mkdirSync(this.#dir, { recursive: true });
		for (const old of [...Object.keys(TYPES), 'none']) {
			if (old !== (ext ?? 'none')) await rm(join(this.#dir, `${host}.${old}`), { force: true });
		}
		await writeFile(join(this.#dir, `${host}.${ext ?? 'none'}`), body);
		this.#known().set(host, { ext, at: Date.now() });
	}
}

/** Fetches at most `max` bytes. Null for an error status or an over-long body. */
async function download(
	url: string,
	max: number,
	accept: string
): Promise<{ body: Buffer; url: string } | null> {
	const response = await fetch(url, {
		headers: { accept, 'user-agent': USER_AGENT },
		redirect: 'follow',
		signal: AbortSignal.timeout(TIMEOUT)
	});
	if (!response.ok || !response.body) {
		await response.body?.cancel();
		return null;
	}
	const chunks: Uint8Array[] = [];
	let size = 0;
	const reader = response.body.getReader();
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		size += value.byteLength;
		if (size >= max) {
			await reader.cancel();
			// Enough of a page to find its <head>; too much for an icon.
			if (accept !== 'text/html') return null;
			break;
		}
	}
	return { body: Buffer.concat(chunks), url: response.url || url };
}

/** What kind of picture this is, from its first bytes (never trusting the server's word). */
export function sniff(body: Buffer): Ext | null {
	if (body.length < 4) return null;
	if (body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
		return 'png';
	if (body[0] === 0 && body[1] === 0 && (body[2] === 1 || body[2] === 2) && body[3] === 0)
		return 'ico';
	if (body.subarray(0, 4).toString('latin1') === 'GIF8') return 'gif';
	if (body[0] === 0xff && body[1] === 0xd8) return 'jpg';
	if (
		body.subarray(0, 4).toString('latin1') === 'RIFF' &&
		body.subarray(8, 12).toString('latin1') === 'WEBP'
	)
		return 'webp';
	const head = body.subarray(0, 512).toString('utf8').trimStart().toLowerCase();
	if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'svg';
	return null;
}

const attribute = (tag: string, name: string): string | null => {
	const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
	return match ? (match[1] ?? match[2] ?? match[3] ?? '') : null;
};

/**
 * The icons a page offers, best first: a sharp PNG near 64px, then SVG, the apple-touch icon,
 * any other, and /favicon.ico last.
 */
export function iconCandidates(html: string, pageUrl: string): string[] {
	const head = html.slice(0, Math.max(html.toLowerCase().indexOf('</head>'), 0) || html.length);
	const found: { href: string; score: number }[] = [];
	for (const [tag] of head.matchAll(/<link\b[^>]*>/gi)) {
		const rel = (attribute(tag, 'rel') ?? '').toLowerCase().split(/\s+/);
		const href = attribute(tag, 'href');
		if (!href || href.startsWith('data:')) continue;
		const isIcon = rel.includes('icon');
		const isApple =
			rel.includes('apple-touch-icon') || rel.includes('apple-touch-icon-precomposed');
		if (!isIcon && !isApple) continue;
		const sizes = (attribute(tag, 'sizes') ?? '').toLowerCase();
		const size = Number(/(\d+)x\d+/.exec(sizes)?.[1] ?? 0);
		const type = (attribute(tag, 'type') ?? '').toLowerCase();
		const svg = type.includes('svg') || /\.svg(\?|$)/i.test(href) || sizes === 'any';
		let score: number;
		if (isApple) score = 60;
		else if (svg) score = 80;
		else if (size >= 32) score = 100 - Math.abs(64 - size) / 8;
		else score = 50 + size / 4;
		try {
			found.push({ href: new URL(href, pageUrl).href, score });
		} catch {
			// A broken href: skip it.
		}
	}
	const ordered = found.sort((a, b) => b.score - a.score).map((entry) => entry.href);
	ordered.push(new URL('/favicon.ico', pageUrl).href);
	return [...new Set(ordered)];
}
