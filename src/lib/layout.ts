import type { Row, SectionId } from './types.ts';

/** Search and Network span the page; on wide screens Links sits left, Today and Treasury right. */
const PLACE: Record<SectionId, 'full' | 'main' | 'side'> = {
	search: 'full',
	network: 'full',
	links: 'main',
	today: 'side',
	treasury: 'side'
};

/**
 * Turns config.yml's section list into rows. Neighbouring column sections share a row; on a
 * phone everything stacks in exactly the configured order (`order`).
 */
export function rowsOf(sections: readonly SectionId[]): Row[] {
	const rows: Row[] = [];
	let split: {
		main: { section: SectionId; order: number }[];
		side: { section: SectionId; order: number }[];
		order: number;
	} | null = null;
	sections.forEach((section, order) => {
		const place = PLACE[section];
		if (place === 'full') {
			split = null;
			rows.push({ kind: 'full', section, order });
			return;
		}
		if (!split) {
			split = { main: [], side: [], order };
			rows.push({ kind: 'split', ...split, main: split.main, side: split.side });
		}
		split[place].push({ section, order });
	});
	return rows;
}
