import type { AgendaDay, AgendaEvent, Money, Owner } from '../types.ts';
import type { CharacterConfig } from './config.ts';

/** Turning upstream answers into what the page shows. Pure, so it's tested without a network. */

/** Currencies written after the amount ("12,480 Ft") and how many decimals they show. */
const AFTER = new Set(['HUF', 'PLN', 'CZK', 'RON']);
const WHOLE = new Set(['HUF', 'JPY', 'KRW', 'ISK']);

/** Minor units (fillér, cents) as parts for the big numerals: "3,019,581" and "Ft". */
export function money(minor: number, currency: string, minorUnits = 100): Money {
	const code = /^[A-Z]{3}$/.test(currency) ? currency : 'HUF';
	const decimals = WHOLE.has(code) ? 0 : 2;
	const value = Math.abs(minor) / minorUnits;
	let symbol = code;
	try {
		symbol =
			new Intl.NumberFormat('en-GB', {
				style: 'currency',
				currency: code,
				currencyDisplay: 'narrowSymbol'
			})
				.formatToParts(0)
				.find((part) => part.type === 'currency')?.value ?? code;
	} catch {
		// An unknown code: show the code itself.
	}
	if (code === 'HUF') symbol = 'Ft';
	const amount = new Intl.NumberFormat('en-GB', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(decimals === 0 ? Math.round(value) : value);
	return {
		amount,
		symbol,
		symbolFirst: !AFTER.has(code),
		negative: minor < 0 && amount.replace(/[0.,]/g, '') !== ''
	};
}

interface Parts {
	readonly date: string; // YYYY-MM-DD
	readonly time: string; // HH:MM
	readonly hour: number;
}

/** A moment's date and time on the wall clock of `timeZone`. */
export function wallClock(date: Date, timeZone: string): Parts {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-GB', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		})
			.formatToParts(date)
			.map((part) => [part.type, part.value])
	);
	return {
		date: `${parts.year}-${parts.month}-${parts.day}`,
		time: `${parts.hour}:${parts.minute}`,
		hour: Number(parts.hour)
	};
}

const DAY_MS = 86_400_000;

/** "Fri 24 Oct" for a calendar date (YYYY-MM-DD). */
function dayLabel(date: string): string {
	return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	});
}

function nextDate(date: string, days: number): string {
	return new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export interface UpcomingEvent {
	readonly title: string;
	readonly start: string;
	readonly end?: string | null;
	readonly allDay?: boolean;
	readonly owner?: Owner;
	readonly location?: string | null;
}

/**
 * The next few events as a short agenda, day by day, in `timeZone`. Events that have already
 * ended are left out; an all-day event shows on the day it starts (or today, if it started
 * earlier and is still on).
 */
export function agenda(
	events: readonly UpcomingEvent[],
	now: Date,
	timeZone: string,
	limit: number
): AgendaDay[] {
	const today = wallClock(now, timeZone).date;
	const tomorrow = nextDate(today, 1);
	const items: { day: string; sort: string; event: AgendaEvent }[] = [];

	for (const event of events) {
		const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
		const allDay = Boolean(event.allDay) || dateOnly.test(event.start);
		const start = dateOnly.test(event.start) ? null : new Date(event.start);
		if (start && Number.isNaN(start.getTime())) continue;
		const endRaw = event.end ?? null;
		const end = endRaw && !dateOnly.test(endRaw) ? new Date(endRaw) : null;

		let day: string;
		let time: string | null = null;
		let endTime: string | null = null;
		if (allDay) {
			day = dateOnly.test(event.start) ? event.start : wallClock(start!, timeZone).date;
			// All-day end dates are exclusive (an event on the 24th ends on the 25th).
			const lastDay = endRaw && dateOnly.test(endRaw) ? nextDate(endRaw, -1) : day;
			if (lastDay < today) continue;
			if (day < today) day = today;
		} else {
			if ((end ?? start!).getTime() < now.getTime()) continue;
			const wall = wallClock(start!, timeZone);
			day = wall.date < today ? today : wall.date;
			time = wall.date < today ? 'Now' : wall.time;
			if (end && !Number.isNaN(end.getTime())) {
				const endWall = wallClock(end, timeZone);
				endTime = endWall.date === wall.date ? endWall.time : null;
			}
		}
		items.push({
			day,
			sort: `${day} ${time === null ? '00:00' : time === 'Now' ? '00:01' : time}`,
			event: {
				title: event.title.trim() || 'Untitled',
				time,
				end: endTime,
				location: event.location?.trim() || null,
				owner: event.owner ?? 'shared'
			}
		});
	}

	items.sort((a, b) => a.sort.localeCompare(b.sort));
	const days: { key: string; label: string; events: AgendaEvent[] }[] = [];
	for (const item of items.slice(0, limit)) {
		let day = days.at(-1);
		if (!day || day.key !== item.day) {
			const label =
				item.day === today ? 'Today' : item.day === tomorrow ? 'Tomorrow' : dayLabel(item.day);
			days.push((day = { key: item.day, label, events: [] }));
		}
		day.events.push(item.event);
	}
	return days;
}

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

/** Morning 5–11, afternoon 12–17, evening 18–21, night 22–4. */
export function dayPart(hour: number): DayPart {
	if (hour >= 5 && hour < 12) return 'morning';
	if (hour >= 12 && hour < 18) return 'afternoon';
	if (hour >= 18 && hour < 22) return 'evening';
	return 'night';
}

/** A line for this time of day (falling back to `any`), picked at random. */
export function greetingLine(
	host: CharacterConfig,
	hour: number,
	random: () => number = Math.random
): string {
	const own = host.lines[dayPart(hour)];
	const pool = own.length > 0 ? own : host.lines.any;
	if (pool.length === 0) return 'Welcome back.';
	return pool[Math.floor(random() * pool.length) % pool.length]!;
}
