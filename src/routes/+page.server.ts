import { rowsOf } from '$lib/layout.ts';
import { assetUrl } from '$lib/server/art.ts';
import { engineName, searchTemplate } from '$lib/server/config.ts';
import { linkGroups } from '$lib/server/links.ts';
import { greetingLine, wallClock } from '$lib/server/present.ts';
import { isHandheld } from '$lib/server/request.ts';
import { runtime } from '$lib/server/runtime.ts';
import {
	calendarGlance,
	compendiumGlance,
	serviceStatus,
	today,
	treasureGlanceFor,
	treasury,
	weather
} from '$lib/server/sources.ts';
import type { Greeting, StripView, Tile } from '$lib/types.ts';
import type { PageServerLoad } from './$types';

/**
 * The whole start page, rendered on the server in one go. Every live part asks its upstream in
 * parallel through the cache, which never waits more than 1.5 s, so the page is quick even when
 * something is down: that section just says so.
 */
export const load: PageServerLoad = async ({ locals, request, depends }) => {
	depends('nj:home');
	const app = runtime();
	const config = app.config();
	const persona = locals.persona;
	const now = new Date();
	const shown = new Set(config.sections);
	const slots = new Set(shown.has('strip') ? config.strip.slots : []);

	const [
		weatherText,
		tiles,
		todayPanel,
		treasuryPanel,
		calendarSlot,
		treasureSlot,
		compendiumSlot
	] = await Promise.all([
		weather(app, config),
		shown.has('network')
			? Promise.all(
					config.network.map(async (service): Promise<Tile> => ({
						id: service.id,
						label: service.label,
						url: service.url,
						hint: service.hint ?? new URL(service.url).hostname,
						arcana: service.arcana,
						accent: service.accent ?? null,
						status: await serviceStatus(app, service)
					}))
				)
			: [],
		shown.has('today') ? today(app, config, persona, now) : null,
		shown.has('treasury') ? treasury(app, config, persona) : null,
		slots.has('calendar') ? calendarGlance(app, config, persona, now) : null,
		slots.has('treasure') ? treasureGlanceFor(app, persona) : null,
		slots.has('compendium') ? compendiumGlance(app, config, now) : null
	]);

	const day = wallClock(now, config.timezone).date;
	const strip: StripView = {
		slots: shown.has('strip') ? config.strip.slots : [],
		calendar: calendarSlot,
		treasure: treasureSlot,
		compendium: compendiumSlot,
		links: {
			calendar: `${config.today.link.replace(/\/+$/, '')}/day/${day}`,
			treasure: config.treasury.link,
			compendium: app.settings.outlinePublicUrl
		},
		compendiumSearch: `${app.settings.outlinePublicUrl}/search`
	};

	const host = config.host[persona];
	const greeting: Greeting = {
		name: host.name,
		arcana: host.arcana,
		arcanaName: host.arcana_name,
		line: greetingLine(host, wallClock(now, config.timezone).hour),
		art: assetUrl(app.paths.assets, host.art)
	};

	return {
		now: now.getTime(),
		timezone: config.timezone,
		weather: weatherText,
		greeting,
		rows: rowsOf(config.sections),
		search: {
			template: searchTemplate(config.search),
			bangs: config.search.bangs,
			engine: engineName(config.search),
			placeholder: config.search.placeholder,
			autofocus: !isHandheld(request.headers.get('user-agent'))
		},
		strip,
		tiles,
		groups: shown.has('links')
			? linkGroups(config, persona, { favicons: app.favicons, assetsDir: app.paths.assets })
			: [],
		today: todayPanel,
		todayLink: config.today.link,
		todayDays: config.today.days,
		treasury: treasuryPanel,
		treasuryLink: config.treasury.link
	};
};
