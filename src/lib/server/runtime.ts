import { env } from '$env/dynamic/private';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { accessOff, discordAccess, type AccessGate } from './access.ts';
import { defaultConfig, parseConfig, type Config } from './config.ts';
import { Favicons } from './favicons.ts';
import { log, messageOf } from './log.ts';
import { Upstream } from './upstream.ts';

/** Settings from .env. Tokens stay here, on the server; nothing below is sent to browsers. */
export interface Settings {
	readonly accessMode: 'discord' | 'off';
	readonly publicUrl: string | null;
	readonly sessionSecret: string | null;
	readonly sessionDomain: string | undefined;
	readonly calendarUrl: string | null;
	readonly calendarToken: string | null;
	readonly treasureUrl: string | null;
	readonly summaryToken: string | null;
}

export interface Runtime {
	readonly version: string;
	readonly settings: Settings;
	readonly paths: { readonly config: string; readonly data: string; readonly assets: string };
	/** The current config.yml; edits are picked up within a few seconds, no restart needed. */
	config(): Config;
	/** Who may come in, for the current config. */
	access(): AccessGate;
	readonly upstream: Upstream;
	readonly favicons: Favicons;
}

declare const __HOME_VERSION__: string;

const KEY = Symbol.for('niijima-home.runtime');
type Holder = { [KEY]?: Runtime };

/** The booted app (boots on first use; the server's init hook calls it at startup). */
export function runtime(): Runtime {
	const holder = globalThis as Holder;
	holder[KEY] ??= boot();
	return holder[KEY];
}

const optional = (value: string | undefined) => {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
};
const withoutSlash = (value: string | null) => value?.replace(/\/+$/, '') ?? null;

function readSettings(): Settings {
	const mode = optional(env.ACCESS_MODE) ?? 'discord';
	if (mode !== 'discord' && mode !== 'off') throw new Error('ACCESS_MODE must be discord or off');
	return {
		accessMode: mode,
		publicUrl: withoutSlash(optional(env.PUBLIC_URL)),
		sessionSecret: optional(env.SESSION_SECRET),
		sessionDomain: optional(env.SESSION_DOMAIN) ?? undefined,
		calendarUrl: withoutSlash(optional(env.CALENDAR_URL)),
		calendarToken: optional(env.CALENDAR_TOKEN),
		treasureUrl: withoutSlash(optional(env.TREASURE_URL)),
		summaryToken: optional(env.SUMMARY_TOKEN)
	};
}

function accessGate(settings: Settings, config: Config): AccessGate {
	if (settings.accessMode === 'off') return accessOff();
	return discordAccess({
		app: {
			clientId: env.DISCORD_CLIENT_ID!.trim(),
			clientSecret: env.DISCORD_CLIENT_SECRET!.trim(),
			redirectUri: `${settings.publicUrl}/auth/callback`
		},
		sessionSecret: settings.sessionSecret!,
		allowedIds: config.access.discord_user_ids
	});
}

function checkSignIn(settings: Settings, config: Config): void {
	if (settings.accessMode === 'off') {
		log('boot', 'ACCESS_MODE=off: anyone who can reach this page sees it. Local development only.');
		return;
	}
	const missing = Object.entries({
		DISCORD_CLIENT_ID: optional(env.DISCORD_CLIENT_ID),
		DISCORD_CLIENT_SECRET: optional(env.DISCORD_CLIENT_SECRET),
		SESSION_SECRET: settings.sessionSecret,
		PUBLIC_URL: settings.publicUrl
	})
		.filter(([, value]) => !value)
		.map(([name]) => name);
	if (missing.length > 0) {
		throw new Error(
			`Discord sign-in needs ${missing.join(', ')} in .env (see README), ` +
				'or ACCESS_MODE=off for local development only.'
		);
	}
	if (settings.sessionSecret!.length < 32) {
		throw new Error('SESSION_SECRET must be at least 32 characters (openssl rand -hex 32).');
	}
	if (config.access.discord_user_ids.length === 0) {
		log(
			'boot',
			'No Discord accounts are allowed yet. Sign in once: the page shows your Discord id to add to config.yml.'
		);
	}
	const publicHost = new URL(settings.publicUrl!).hostname;
	const others = Object.keys(config.hosts).filter((host) => host !== publicHost);
	if (others.length > 0 && !settings.sessionDomain) {
		log(
			'boot',
			`SESSION_DOMAIN is not set, so signing in on ${publicHost} does not carry over to ${others.join(', ')}. Set SESSION_DOMAIN=niijimasisters.com.`
		);
	}
}

function boot(): Runtime {
	const version = typeof __HOME_VERSION__ === 'string' ? __HOME_VERSION__ : 'dev';
	log('boot', `Niijima Home ${version} starting`);

	const settings = readSettings();
	const paths = {
		config: resolve(optional(env.HOME_CONFIG) ?? 'config.yml'),
		data: resolve(optional(env.HOME_DATA) ?? 'data'),
		assets: resolve(optional(env.HOME_ASSETS) ?? 'assets')
	};

	// The config, re-read when the file changes (checked at most every 2 seconds).
	let config: Config;
	let stamp = '';
	let checkedAt = 0;
	const fileStamp = () => {
		try {
			const info = statSync(paths.config);
			return `${info.mtimeMs}:${info.size}`;
		} catch {
			return 'missing';
		}
	};
	const load = (): Config => {
		if (!existsSync(paths.config)) {
			log(
				'config',
				`${paths.config} not found; using defaults. Copy config.example.yml to config.yml.`
			);
			return defaultConfig();
		}
		return parseConfig(readFileSync(paths.config, 'utf8'), 'config.yml');
	};
	stamp = fileStamp();
	config = load(); // a broken config.yml stops the app here, with the message
	checkSignIn(settings, config);
	let gate = accessGate(settings, config);

	const current = (): Config => {
		const now = Date.now();
		if (now - checkedAt < 2_000) return config;
		checkedAt = now;
		const next = fileStamp();
		if (next === stamp) return config;
		stamp = next;
		try {
			config = load();
			gate = accessGate(settings, config);
			log('config', 'config.yml changed: reloaded');
		} catch (error) {
			log(
				'config',
				`config.yml changed but has a problem; still using the previous one.\n${messageOf(error)}`
			);
		}
		return config;
	};

	const upstream = new Upstream({
		onError: (key, detail) => log('upstream', `${key}: ${detail}`)
	});
	const favicons = new Favicons(resolve(paths.data, 'icons'), (message) => log('icons', message));

	log(
		'boot',
		`ready · sign-in ${settings.accessMode} · calendar ${settings.calendarUrl ? 'on' : 'off'} · treasury ${settings.treasureUrl && settings.summaryToken ? 'on' : 'off'}`
	);
	return {
		version,
		settings,
		paths,
		config: current,
		access: () => {
			current();
			return gate;
		},
		upstream,
		favicons
	};
}
