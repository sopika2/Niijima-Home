import type { Persona } from '@niijima/design';

/** What the server hands the page. Plain data, no tokens. */

export type Owner = Persona | 'shared';

/** A section that depends on another app: there, not set up, or not answering. */
export type Panel<T> =
	| { readonly state: 'ok'; readonly value: T; readonly stale: boolean; readonly at: number }
	| { readonly state: 'off'; readonly hint: string }
	| { readonly state: 'unavailable'; readonly hint: string };

export type ServiceStatus = 'up' | 'down' | 'checking' | 'unchecked' | 'soon';

export interface Tile {
	readonly id: string;
	readonly label: string;
	readonly url: string;
	readonly hint: string;
	readonly arcana: string;
	readonly accent: Persona | null;
	readonly status: ServiceStatus;
}

export interface LinkView {
	readonly label: string;
	readonly url: string;
	readonly host: string;
	/** The icon's address, or null for a letter tile. */
	readonly icon: string | null;
	readonly letter: string;
	/** Which colour the letter tile gets (0–2), from the label, so it never changes. */
	readonly tone: number;
	/** The number key that opens it (1–9), or null. */
	readonly key: number | null;
}

export interface GroupView {
	readonly title: string;
	readonly owner: Owner;
	readonly links: readonly LinkView[];
}

export interface AgendaEvent {
	readonly title: string;
	/** "09:30", or null for all day. */
	readonly time: string | null;
	readonly end: string | null;
	readonly location: string | null;
	readonly owner: Owner;
}

export interface AgendaDay {
	readonly key: string;
	/** "Today", "Tomorrow", "Fri 24 Oct". */
	readonly label: string;
	readonly events: readonly AgendaEvent[];
}

export interface Money {
	/** "3,019,581" */
	readonly amount: string;
	/** "Ft", "€" */
	readonly symbol: string;
	readonly symbolFirst: boolean;
	readonly negative: boolean;
}

export interface TreasuryView {
	readonly total: Money;
	readonly endOfMonth: Money | null;
	readonly bills: readonly { name: string; when: string; amount: Money }[];
	readonly verdicts: number;
	readonly missingRates: readonly string[];
}

/** The strip's three slots: Calendar, Treasure and the Compendium, at a glance. */
export type StripSlot = 'calendar' | 'treasure' | 'compendium';

export interface GlanceEvent {
	/** "Today", "Tomorrow", "Fri 24 Oct". */
	readonly day: string;
	/** "09:30", "Now", or null for all day. */
	readonly time: string | null;
	readonly title: string;
	readonly owner: Owner;
	/** That day in Calendar. */
	readonly href: string;
}

export interface TreasureGlance {
	readonly total: Money;
	readonly endOfMonth: Money | null;
	/** Budgets past their limit, and budgets close to it. */
	readonly over: number;
	readonly near: number;
	readonly nextBill: {
		readonly name: string;
		readonly when: string;
		readonly amount: Money;
	} | null;
}

export interface GlanceDocument {
	readonly title: string;
	readonly href: string;
	/** "5 min ago", "yesterday", "12 Oct". */
	readonly ago: string;
	readonly collection: string | null;
}

export interface StripView {
	readonly slots: readonly StripSlot[];
	readonly calendar: Panel<readonly GlanceEvent[]> | null;
	readonly treasure: Panel<TreasureGlance> | null;
	readonly compendium: Panel<readonly GlanceDocument[]> | null;
	/** Where each slot's name takes you: today in Calendar, Treasure, the wiki. */
	readonly links: Readonly<Record<StripSlot, string>>;
	/** The wiki's search page; the box sends `query`. */
	readonly compendiumSearch: string;
}

export interface Greeting {
	readonly name: string;
	readonly arcana: string;
	readonly arcanaName: string;
	readonly line: string;
	/** The art's address, or null for the placeholder silhouette. */
	readonly art: string | null;
}

export type SectionId = 'search' | 'strip' | 'network' | 'links' | 'today' | 'treasury';

/** One row of the page: a full-width section, or a main column next to a side column. */
export type Row =
	| { readonly kind: 'full'; readonly section: SectionId; readonly order: number }
	| {
			readonly kind: 'split';
			readonly main: readonly { section: SectionId; order: number }[];
			readonly side: readonly { section: SectionId; order: number }[];
			readonly order: number;
	  };
