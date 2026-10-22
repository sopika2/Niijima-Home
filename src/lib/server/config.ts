import { parse as parseYaml, YAMLParseError } from 'yaml';
import { z } from 'zod';
import { ENGINES } from '../search.ts';

/**
 * config.yml: what the start page shows. Anything left out takes the default shown in
 * config.example.yml. A typo stops the app at startup with a message naming the setting; a
 * typo in a later edit keeps the last good config running and logs the problem.
 */

export const SECTIONS = ['search', 'strip', 'network', 'links', 'today', 'treasury'] as const;
export type SectionId = (typeof SECTIONS)[number];
/** What shows when config.yml doesn't say: the strip, not the big Today and Treasury. */
const OLD_DEFAULT_SECTIONS = ['search', 'network', 'links', 'today', 'treasury'];
export const DEFAULT_SECTIONS: SectionId[] = ['search', 'strip', 'network', 'links'];

export const STRIP_SLOTS = ['calendar', 'treasure', 'compendium'] as const;
const persona = z.enum(['makoto', 'sae']);

const httpUrl = z
	.string()
	.trim()
	.refine(
		(value) => {
			try {
				const url = new URL(value);
				return url.protocol === 'http:' || url.protocol === 'https:';
			} catch {
				return false;
			}
		},
		{ message: 'must be a full address starting with http:// or https://' }
	);

const assetPath = z
	.string()
	.regex(/^\/assets\/[\w-][\w./-]*\.(png|jpe?g|webp|avif|gif|svg)$/i, {
		message: 'must be a picture in the assets folder, e.g. /assets/makoto.webp'
	})
	.refine((value) => !value.includes('..'), { message: 'must not contain ".."' });

/** Arcana numerals: YAML reads 0 or 10 as numbers, which is fine. */
const numeral = z.union([z.string(), z.number()]).transform(String).pipe(z.string().max(8));

const timezone = z.string().refine(
	(zone) => {
		try {
			new Intl.DateTimeFormat('en', { timeZone: zone });
			return true;
		} catch {
			return false;
		}
	},
	{ message: 'must be an IANA time zone such as Europe/Budapest' }
);

const lines = z.array(z.string().trim().min(1)).default([]);

const character = (defaults: {
	name: string;
	art: string;
	arcana: string;
	arcana_name: string;
	lines: Record<'morning' | 'afternoon' | 'evening' | 'night' | 'any', string[]>;
}) =>
	z
		.strictObject({
			name: z.string().trim().min(1).default(defaults.name),
			/** A picture in ./assets; a missing file shows a placeholder silhouette. */
			art: assetPath.nullable().default(defaults.art),
			arcana: numeral.default(defaults.arcana),
			arcana_name: z.string().default(defaults.arcana_name),
			lines: z
				.strictObject({
					morning: lines,
					afternoon: lines,
					evening: lines,
					night: lines,
					any: lines
				})
				.default(defaults.lines)
		})
		.prefault({});

const service = z.strictObject({
	id: z.string().regex(/^[a-z0-9-]+$/, { message: 'use lowercase letters, digits and dashes' }),
	label: z.string().trim().min(1),
	url: httpUrl,
	/** What to ping for the up/down dot; defaults to `url`. false = never check. */
	check: z.union([httpUrl, z.literal(false)]).optional(),
	arcana: numeral.default(''),
	/** A small line under the name. Defaults to the host. */
	hint: z.string().optional(),
	accent: persona.optional(),
	/** soon: shows a COMING SOON stamp and isn't checked. */
	status: z.enum(['online', 'soon']).default('online')
});

const link = z.strictObject({
	label: z.string().trim().min(1),
	url: httpUrl,
	/** auto = the site's own icon, letter = a letter tile, or a picture in ./assets. */
	icon: z.union([z.literal('auto'), z.literal('letter'), assetPath]).default('auto')
});

const group = z.strictObject({
	group: z.string().trim().min(1),
	links: z.array(link).default([])
});

const hostName = z
	.string()
	.trim()
	.toLowerCase()
	.regex(/^[a-z0-9.-]+$/, { message: 'must be a host name like makoto.niijimasisters.com' });

const DEFAULT_NETWORK = [
	{
		id: 'landing',
		label: 'Network',
		url: 'https://niijimasisters.com',
		arcana: 'XXI',
		hint: 'The World'
	},
	{
		id: 'treasure',
		label: 'Treasure',
		url: 'https://treasure.niijimasisters.com',
		arcana: 'X',
		hint: 'Money'
	},
	{
		id: 'calendar',
		label: 'Calendar',
		url: 'https://calendar.niijimasisters.com',
		arcana: 'XIX',
		hint: 'Days'
	},
	{
		id: 'archive',
		label: 'Archive',
		url: 'https://archive.niijimasisters.com',
		arcana: 'IX',
		hint: 'Records'
	},
	{
		id: 'mementos',
		label: 'Mementos',
		url: 'https://mementos.niijimasisters.com',
		arcana: 'XVIII',
		hint: 'Images'
	},
	{
		id: 'compendium',
		label: 'Compendium',
		url: 'https://compendium.niijimasisters.com',
		arcana: 'XI',
		hint: 'Wiki'
	}
];

export const configSchema = z.strictObject({
	/** The tab title. */
	title: z.string().trim().min(1).default('Niijima Home'),
	/** For the calendar, the greeting and Today. */
	timezone: timezone.default('Europe/Budapest'),
	/** Where the weather is for (Open-Meteo, free, no key). false hides it. */
	weather: z
		.union([
			z.literal(false),
			z.strictObject({
				latitude: z.number().min(-90).max(90),
				longitude: z.number().min(-180).max(180)
			})
		])
		.default({ latitude: 47.4979, longitude: 19.0402 }),
	/** Hosts that always show one sister's page. Any other host follows the persona switch. */
	hosts: z
		.record(hostName, persona)
		.default({ 'makoto.niijimasisters.com': 'makoto', 'sae.niijimasisters.com': 'sae' }),
	/** Which sections show, in this order. Leave one out to hide it. */
	sections: z
		.array(z.enum(SECTIONS))
		.refine((list) => new Set(list).size === list.length, { message: 'lists a section twice' })
		// The list every config.yml had before the strip: read it as today's default, so an
		// untouched config gets the strip without editing.
		.transform((list) =>
			list.join() === OLD_DEFAULT_SECTIONS.join() ? [...DEFAULT_SECTIONS] : list
		)
		.default([...DEFAULT_SECTIONS]),
	/** The small panel near the top: Calendar, Treasure and the Compendium at a glance. */
	strip: z
		.strictObject({
			/** Which slots show, left to right (first on a phone). Leave one out to hide it. */
			slots: z
				.array(z.enum(STRIP_SLOTS))
				.refine((list) => new Set(list).size === list.length, { message: 'lists a slot twice' })
				.default([...STRIP_SLOTS]),
			/** How many upcoming events. */
			events: z.number().int().min(1).max(5).default(3),
			/** How many recently updated wiki pages (a phone shows at most three). */
			documents: z.number().int().min(1).max(8).default(5)
		})
		.prefault({}),
	/** Who greets you: Makoto on her page, Sae on hers. */
	host: z
		.strictObject({
			makoto: character({
				name: 'Makoto',
				art: '/assets/menu-makoto.png',
				arcana: 'II',
				arcana_name: 'The Priestess',
				lines: {
					morning: ["Good morning. Let's plan the day before it plans us."],
					afternoon: ['Afternoon check-in: how far down the list are we?'],
					evening: ["Evening. Let's look back at what got done today."],
					night: ["It's late. Whatever it is, it will keep until morning."],
					any: ['Ready when you are.']
				}
			}),
			sae: character({
				name: 'Sae',
				art: '/assets/menu-sae.png',
				arcana: 'XX',
				arcana_name: 'Judgement',
				lines: {
					morning: ['Morning. Coffee first, then the case files.'],
					afternoon: ['Keep the facts in order and the rest follows.'],
					evening: ['Close the files you can. The rest waits for tomorrow.'],
					night: ['Burning the midnight oil again? …So am I.'],
					any: ["Let's hear it. What's on the docket?"]
				}
			})
		})
		.prefault({}),
	search: z
		.strictObject({
			engine: z.enum(['duckduckgo', 'google', 'startpage', 'kagi', 'custom']).default('duckduckgo'),
			/** For engine: custom. {q} is replaced with the words. */
			url: httpUrl
				.refine((value) => value.includes('{q}'), { message: 'must contain {q}' })
				.optional(),
			/** Send !bangs (!w, !yt…) to DuckDuckGo whatever the engine. */
			bangs: z.boolean().default(true),
			placeholder: z.string().default('Search or type an address')
		})
		.prefault({})
		.refine((search) => search.engine !== 'custom' || search.url, {
			message: 'engine: custom needs a url with {q} in it',
			path: ['url']
		}),
	/** The Niijima services, as tiles with a live up/down dot. */
	network: z.array(service).prefault(DEFAULT_NETWORK),
	/** Your bookmarks: each sister's own groups first, then the shared ones. */
	links: z
		.strictObject({
			makoto: z.array(group).default([]),
			sae: z.array(group).default([]),
			shared: z.array(group).default([])
		})
		.prefault({}),
	today: z
		.strictObject({
			days: z.number().int().min(1).max(31).default(7),
			limit: z.number().int().min(1).max(30).default(8),
			link: httpUrl.default('https://calendar.niijimasisters.com')
		})
		.prefault({}),
	treasury: z
		.strictObject({
			/** How many upcoming bills to list under the total. */
			bills: z.number().int().min(0).max(5).default(3),
			link: httpUrl.default('https://treasure.niijimasisters.com')
		})
		.prefault({}),
	access: z
		.strictObject({
			/** Discord accounts allowed to sign in, by user id. */
			discord_user_ids: z
				.array(
					z
						.union([z.string(), z.number()])
						.transform(String)
						.pipe(
							z
								.string()
								.regex(/^\d{15,21}$/, { message: 'must be a Discord user id (digits only)' })
						)
				)
				.default([])
		})
		.prefault({})
});

export type Config = z.output<typeof configSchema>;
export type ServiceConfig = Config['network'][number];
export type LinkConfig = z.output<typeof link>;
export type CharacterConfig = Config['host']['makoto'];

export class InvalidConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidConfigError';
	}
}

/** YAML reads long Discord ids as numbers, which would round them; keep them exact. */
function numbersFromYaml(value: unknown): unknown {
	if (typeof value === 'bigint') {
		return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString();
	}
	if (Array.isArray(value)) return value.map(numbersFromYaml);
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, inner]) => [key, numbersFromYaml(inner)])
		);
	}
	return value;
}

/** Validates config.yml text. An empty file gives all defaults. */
export function parseConfig(text: string, file = 'config.yml'): Config {
	let raw: unknown;
	try {
		raw = numbersFromYaml(parseYaml(text, { intAsBigInt: true }) ?? {});
	} catch (error) {
		const detail = error instanceof YAMLParseError ? error.message : String(error);
		throw new InvalidConfigError(`${file} is not valid YAML:\n  ${detail}`);
	}
	const result = configSchema.safeParse(raw);
	if (!result.success) {
		const issues = result.error.issues.map(
			(issue) => `  - ${issue.path.length ? issue.path.join('.') : '(top level)'}: ${issue.message}`
		);
		throw new InvalidConfigError(
			`${file} has ${issues.length === 1 ? 'a problem' : `${issues.length} problems`}:\n${issues.join('\n')}`
		);
	}
	return result.data;
}

export function defaultConfig(): Config {
	return parseConfig('');
}

/** The search engine's URL template from the config. */
export function searchTemplate(search: Config['search']): string {
	return search.engine === 'custom' ? search.url! : ENGINES[search.engine].url;
}

export function engineName(search: Config['search']): string {
	return search.engine === 'custom' ? new URL(search.url!).hostname : ENGINES[search.engine].name;
}
