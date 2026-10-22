import type { AgendaDay, GlanceDocument, GlanceEvent, Money, TreasureGlance } from '../types.ts';
import type { RecentDocuments } from './outline.ts';

/** Shaping the strip's three slots from what the apps answered. Pure, so it's tested offline. */

/** The first `count` events of an agenda, each with a link to its day in Calendar. */
export function nextEvents(
	days: readonly AgendaDay[],
	count: number,
	calendarUrl: string
): GlanceEvent[] {
	const base = calendarUrl.replace(/\/+$/, '');
	return days
		.flatMap((day) =>
			day.events.map((event) => ({
				day: day.label,
				time: event.time,
				title: event.title,
				owner: event.owner,
				href: `${base}/day/${day.key}`
			}))
		)
		.slice(0, count);
}

export interface SummaryGlanceInput {
	readonly total: Money;
	readonly endOfMonth: Money | null;
	readonly budgets: readonly { readonly category: string; readonly percent: number }[];
	readonly bills: readonly {
		readonly name: string;
		readonly when: string;
		readonly amount: Money;
	}[];
}

/** Treasure at a glance: a budget at 100 % or more is over, anything Treasure flags below is near. */
export function treasureGlance(input: SummaryGlanceInput): TreasureGlance {
	const over = input.budgets.filter((budget) => budget.percent >= 100).length;
	return {
		total: input.total,
		endOfMonth: input.endOfMonth,
		over,
		near: input.budgets.length - over,
		nextBill: input.bills[0] ?? null
	};
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", then the date: "12 Oct". */
export function ago(then: number, now: number, timeZone: string): string {
	const gap = now - then;
	if (gap < MINUTE) return 'just now';
	if (gap < HOUR) return `${Math.floor(gap / MINUTE)} min ago`;
	if (gap < DAY) return `${Math.floor(gap / HOUR)} h ago`;
	if (gap < 2 * DAY) return 'yesterday';
	if (gap < 7 * DAY) return `${Math.floor(gap / DAY)} days ago`;
	const date = new Date(then);
	const sameYear =
		date.toLocaleDateString('en-GB', { year: 'numeric', timeZone }) ===
		new Date(now).toLocaleDateString('en-GB', { year: 'numeric', timeZone });
	return date.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		...(sameYear ? {} : { year: 'numeric' }),
		timeZone
	});
}

/**
 * The newest wiki pages as links on the public address. Outline gives each document's path
 * ("/doc/…"); an absolute address is cut down to its path, since OUTLINE_URL may be internal.
 */
export function compendiumDocs(
	recent: RecentDocuments,
	publicUrl: string,
	now: number,
	timeZone: string,
	count: number
): GlanceDocument[] {
	const base = publicUrl.replace(/\/+$/, '');
	const docs: GlanceDocument[] = [];
	for (const doc of recent.documents) {
		if (docs.length >= count) break;
		let path = doc.url.trim();
		if (/^https?:\/\//i.test(path)) {
			try {
				const url = new URL(path);
				path = url.pathname + url.search + url.hash;
			} catch {
				continue;
			}
		}
		if (!path.startsWith('/')) path = `/${path}`;
		const updated = Date.parse(doc.updatedAt);
		docs.push({
			title: doc.title.trim() || 'Untitled',
			href: `${base}${path}`,
			ago: Number.isNaN(updated) ? '' : ago(updated, now, timeZone),
			collection: (doc.collectionId && recent.collections[doc.collectionId]) || null
		});
	}
	return docs;
}
