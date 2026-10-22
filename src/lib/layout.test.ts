import { describe, expect, it } from 'vitest';
import { rowsOf } from './layout.ts';

describe('section rows', () => {
	it('puts search and network full width and pairs links with today and treasury', () => {
		expect(rowsOf(['search', 'network', 'links', 'today', 'treasury'])).toEqual([
			{ kind: 'full', section: 'search', order: 0 },
			{ kind: 'full', section: 'network', order: 1 },
			{
				kind: 'split',
				order: 2,
				main: [{ section: 'links', order: 2 }],
				side: [
					{ section: 'today', order: 3 },
					{ section: 'treasury', order: 4 }
				]
			}
		]);
	});

	it('gives the strip the full width, under the search', () => {
		expect(rowsOf(['search', 'strip', 'network', 'links'])).toEqual([
			{ kind: 'full', section: 'search', order: 0 },
			{ kind: 'full', section: 'strip', order: 1 },
			{ kind: 'full', section: 'network', order: 2 },
			{ kind: 'split', order: 3, main: [{ section: 'links', order: 3 }], side: [] }
		]);
	});

	it('keeps the configured order across rows', () => {
		const rows = rowsOf(['today', 'search', 'links']);
		expect(rows.map((row) => row.kind)).toEqual(['split', 'full', 'split']);
		expect(rows[0]).toMatchObject({ main: [], side: [{ section: 'today', order: 0 }] });
	});
});
