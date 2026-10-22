import type { Persona } from '@niijima/design';
import { z } from 'zod';
import type {
	AgendaDay,
	GlanceDocument,
	GlanceEvent,
	Panel,
	ServiceStatus,
	TreasureGlance,
	TreasuryView
} from '../types.ts';
import { weatherLabel } from '../weather.ts';
import type { Config, ServiceConfig } from './config.ts';
import { compendiumDocs, nextEvents, treasureGlance } from './glance.ts';
import { recentDocuments } from './outline.ts';
import { agenda, money } from './present.ts';
import type { Runtime } from './runtime.ts';
import { fetchJson, type Fetched } from './upstream.ts';

/**
 * The live parts of the page, each through the upstream cache: weather from Open-Meteo, the
 * up/down dots, Today and the strip's Calendar from Niijima Calendar, the Treasury and the
 * strip's Treasure from Treasure, and the strip's Compendium from the Outline wiki. Tokens are used
 * here and never leave the server.
 */

const weatherSchema = z.object({
	current: z.object({
		weather_code: z.number().nullish(),
		temperature_2m: z.number().nullish(),
		is_day: z.number().nullish()
	})
});

/** "Cloudy 13°", or null when the weather is off or not answering (the tag just isn't shown). */
export async function weather(app: Runtime, config: Config): Promise<string | null> {
	if (config.weather === false) return null;
	const { latitude, longitude } = config.weather;
	const url =
		`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
		'&current=weather_code,temperature_2m,is_day&timezone=auto';
	const result = await app.upstream.get(`weather:${latitude},${longitude}`, async (signal) =>
		weatherLabel(weatherSchema.parse(await fetchJson(url, { signal })).current)
	);
	return result.ok ? result.value : null;
}

/**
 * Is it up? Any answer below 500 counts (a sign-in redirect or a 401 means the app is there);
 * 5xx (Cloudflare's 502/530 when the app is gone) or no answer at all means down.
 */
async function ping(url: string, signal: AbortSignal): Promise<'up' | 'down'> {
	try {
		let response = await fetch(url, { method: 'HEAD', redirect: 'manual', signal });
		if (response.status === 405 || response.status === 501) {
			response = await fetch(url, { method: 'GET', redirect: 'manual', signal });
		}
		await response.body?.cancel();
		return response.status < 500 ? 'up' : 'down';
	} catch (error) {
		if (signal.aborted) throw error; // too slow: let the cache count it as a timeout
		return 'down';
	}
}

export async function serviceStatus(app: Runtime, service: ServiceConfig): Promise<ServiceStatus> {
	if (service.status === 'soon') return 'soon';
	if (service.check === false) return 'unchecked';
	const target = service.check ?? service.url;
	const result = await app.upstream.get(`status:${target}`, (signal) => ping(target, signal));
	if (result.ok) return result.value;
	return result.reason === 'late' ? 'checking' : 'down';
}

/** Words for a section whose app didn't answer properly. */
function hintFor(
	result: Extract<Fetched<unknown>, { ok: false }>,
	app: string,
	tokenName: string
): string {
	if (result.reason !== 'error') return `${app} didn't answer in time.`;
	const status = /^HTTP (\d{3})/.exec(result.detail)?.[1];
	if (status === '401' || status === '403')
		return `${app} refused the token: check ${tokenName} in .env.`;
	if (status === '404')
		return `${app} has no feed at that address: check its URL and ${tokenName}.`;
	if (status) return `${app} answered with an error (${status}).`;
	return `${app} can't be reached right now.`;
}

function panel<T, U>(
	result: Fetched<T>,
	present: (value: T) => U,
	app: string,
	tokenName: string
): Panel<U> {
	if (!result.ok) return { state: 'unavailable', hint: hintFor(result, app, tokenName) };
	return { state: 'ok', value: present(result.value), stale: result.stale, at: result.at };
}

const ownerSchema = z.enum(['makoto', 'sae', 'shared']).catch('shared');
const upcomingSchema = z.object({
	events: z.array(
		z.object({
			title: z.string().catch('Untitled'),
			start: z.string(),
			end: z.string().nullish(),
			allDay: z.boolean().nullish(),
			owner: ownerSchema.optional(),
			location: z.string().nullish()
		})
	)
});

/** The raw upcoming events, through the cache; the strip and Today share one answer. */
function upcoming(app: Runtime, config: Config, persona: Persona) {
	const { calendarUrl, calendarToken } = app.settings;
	if (!calendarUrl) return null;
	const url = `${calendarUrl}/api/upcoming?days=${config.today.days}&persona=${persona}`;
	return app.upstream.get(`calendar:${persona}:${config.today.days}`, async (signal) =>
		upcomingSchema
			.parse(await fetchJson(url, { signal, token: calendarToken ?? undefined }))
			.events.map((event) => ({ ...event, allDay: event.allDay ?? false }))
	);
}

const CALENDAR_OFF = 'Set CALENDAR_URL and CALENDAR_TOKEN in .env to see your days here.';

export async function today(
	app: Runtime,
	config: Config,
	persona: Persona,
	now: Date
): Promise<Panel<AgendaDay[]>> {
	const result = await upcoming(app, config, persona);
	if (!result) return { state: 'off', hint: CALENDAR_OFF };
	return panel(
		result,
		(events) => agenda(events, now, config.timezone, config.today.limit),
		'Calendar',
		'CALENDAR_TOKEN'
	);
}

/** The strip's Calendar slot: the next few events, today and tomorrow first. */
export async function calendarGlance(
	app: Runtime,
	config: Config,
	persona: Persona,
	now: Date
): Promise<Panel<GlanceEvent[]>> {
	const result = await upcoming(app, config, persona);
	if (!result) return { state: 'off', hint: 'Add CALENDAR_URL and CALENDAR_TOKEN to .env.' };
	return panel(
		result,
		(events) =>
			nextEvents(
				agenda(events, now, config.timezone, config.strip.events),
				config.strip.events,
				config.today.link
			),
		'Calendar',
		'CALENDAR_TOKEN'
	);
}

const summarySchema = z.object({
	base_currency: z.string().catch('HUF'),
	minor_units: z.number().positive().catch(100),
	total: z.number(),
	missing_rates: z.array(z.string()).catch([]),
	projected: z.object({ end_of_month: z.number() }).nullish().catch(null),
	next_bills: z
		.array(z.object({ name: z.string(), date: z.string(), amount: z.number() }))
		.catch([]),
	budgets_over_warn: z.array(z.object({ category: z.string(), percent: z.number() })).catch([]),
	verdicts: z.number().int().catch(0)
});

const billDate = (date: string) =>
	/^\d{4}-\d{2}-\d{2}$/.test(date)
		? new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
				weekday: 'short',
				day: 'numeric',
				month: 'short',
				timeZone: 'UTC'
			})
		: date;

function summary(app: Runtime, persona: Persona) {
	const { treasureUrl, summaryToken } = app.settings;
	if (!treasureUrl || !summaryToken) return null;
	const url = `${treasureUrl}/api/summary?persona=${persona}`;
	return app.upstream.get(`treasury:${persona}`, async (signal) => {
		const answer = summarySchema.parse(await fetchJson(url, { signal, token: summaryToken }));
		const cash = (minor: number) => money(minor, answer.base_currency, answer.minor_units);
		return {
			total: cash(answer.total),
			endOfMonth: answer.projected ? cash(answer.projected.end_of_month) : null,
			bills: answer.next_bills.map((bill) => ({
				name: bill.name,
				when: billDate(bill.date),
				amount: cash(bill.amount)
			})),
			budgets: answer.budgets_over_warn,
			verdicts: answer.verdicts,
			missingRates: answer.missing_rates
		};
	});
}

const TREASURE_OFF = 'Set TREASURE_URL and SUMMARY_TOKEN in .env to see your money here.';

export async function treasury(
	app: Runtime,
	config: Config,
	persona: Persona
): Promise<Panel<TreasuryView>> {
	const result = await summary(app, persona);
	if (!result) return { state: 'off', hint: TREASURE_OFF };
	return panel(
		result,
		(view): TreasuryView => ({
			total: view.total,
			endOfMonth: view.endOfMonth,
			bills: view.bills.slice(0, config.treasury.bills),
			verdicts: view.verdicts,
			missingRates: view.missingRates
		}),
		'Treasure',
		'SUMMARY_TOKEN'
	);
}

/** The strip's Treasure slot: the total, the month-end forecast and budgets near their limit. */
export async function treasureGlanceFor(
	app: Runtime,
	persona: Persona
): Promise<Panel<TreasureGlance>> {
	const result = await summary(app, persona);
	if (!result) return { state: 'off', hint: 'Add TREASURE_URL and SUMMARY_TOKEN to .env.' };
	return panel(result, treasureGlance, 'Treasure', 'SUMMARY_TOKEN');
}

/** The strip's Compendium slot: the wiki pages changed most recently. */
export async function compendiumGlance(
	app: Runtime,
	config: Config,
	now: Date
): Promise<Panel<GlanceDocument[]>> {
	const { outlineUrl, outlineToken, outlinePublicUrl } = app.settings;
	if (!outlineToken) {
		return { state: 'off', hint: 'Add OUTLINE_TOKEN to .env.' };
	}
	const count = config.strip.documents;
	const result = await app.upstream.get(`compendium:${count}`, (signal) =>
		recentDocuments(outlineUrl, outlineToken, count, signal)
	);
	return panel(
		result,
		(recent) => compendiumDocs(recent, outlinePublicUrl, now.getTime(), config.timezone, count),
		'Compendium',
		'OUTLINE_TOKEN'
	);
}
