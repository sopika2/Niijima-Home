import { describe, expect, it } from 'vitest';
import { ago, compendiumDocs, nextEvents, treasureGlance } from './glance.ts';
import { agenda, money } from './present.ts';

const zone = 'Europe/Budapest';
const now = new Date('2026-10-21T10:00:00Z'); // 12:00 in Budapest

describe('the Calendar slot', () => {
	const days = agenda(
		[
			{ title: 'Later', start: '2026-10-24T08:00:00Z', owner: 'sae' },
			{ title: 'Exam', start: '2026-10-22', end: '2026-10-23', allDay: true, owner: 'makoto' },
			{ title: 'Lunch', start: '2026-10-21T11:00:00Z', end: '2026-10-21T12:00:00Z' },
			{ title: 'Dinner', start: '2026-10-21T17:30:00Z', owner: 'makoto' }
		],
		now,
		zone,
		8
	);

	it('takes the next few events, today and tomorrow first, each linking to its day', () => {
		expect(nextEvents(days, 3, 'https://calendar.niijimasisters.com/')).toEqual([
			{
				day: 'Today',
				time: '13:00',
				title: 'Lunch',
				owner: 'shared',
				href: 'https://calendar.niijimasisters.com/day/2026-10-21'
			},
			{
				day: 'Today',
				time: '19:30',
				title: 'Dinner',
				owner: 'makoto',
				href: 'https://calendar.niijimasisters.com/day/2026-10-21'
			},
			{
				day: 'Tomorrow',
				time: null,
				title: 'Exam',
				owner: 'makoto',
				href: 'https://calendar.niijimasisters.com/day/2026-10-22'
			}
		]);
	});

	it('is empty when nothing is planned', () => {
		expect(nextEvents([], 3, 'https://calendar.niijimasisters.com')).toEqual([]);
	});
});

describe('the Treasure slot', () => {
	const total = money(301_958_100, 'HUF');
	it('counts budgets over their limit and near it', () => {
		const glance = treasureGlance({
			total,
			endOfMonth: money(250_000_000, 'HUF'),
			budgets: [
				{ category: 'Food', percent: 112 },
				{ category: 'Fun', percent: 100 },
				{ category: 'Books', percent: 84 }
			],
			bills: [
				{ name: 'Rent', when: 'Fri 24 Oct', amount: money(18_000_000, 'HUF') },
				{ name: 'Phone', when: 'Sat 25 Oct', amount: money(800_000, 'HUF') }
			]
		});
		expect(glance).toMatchObject({ over: 2, near: 1, nextBill: { name: 'Rent' } });
		expect(glance.total.amount).toBe('3,019,581');
		expect(glance.endOfMonth?.amount).toBe('2,500,000');
	});

	it('is calm when every budget is fine and nothing is due', () => {
		expect(treasureGlance({ total, endOfMonth: null, budgets: [], bills: [] })).toMatchObject({
			over: 0,
			near: 0,
			endOfMonth: null,
			nextBill: null
		});
	});
});

describe('relative times', () => {
	const at = now.getTime();
	it.each([
		[20_000, 'just now'],
		[5 * 60_000, '5 min ago'],
		[3 * 3_600_000 + 59 * 60_000, '3 h ago'],
		[30 * 3_600_000, 'yesterday'],
		[4 * 86_400_000, '4 days ago'],
		[10 * 86_400_000, '11 Oct']
	])('%i ms ago reads "%s"', (gap, text) => {
		expect(ago(at - gap, at, zone)).toBe(text);
	});

	it('adds the year for last year', () => {
		expect(ago(Date.parse('2025-12-30T12:00:00Z'), at, zone)).toBe('30 Dec 2025');
	});
});

describe('the Compendium slot', () => {
	const recent = {
		documents: [
			{
				id: '1',
				title: ' Tea notes ',
				url: '/doc/tea-notes-Xk2b9QnLtZ',
				updatedAt: '2026-10-21T09:00:00Z',
				collectionId: 'c1'
			},
			{
				id: '2',
				title: 'Case files',
				url: 'http://outline:3000/doc/case-files-AbC123#h-intro',
				updatedAt: '2026-10-21T09:58:30Z',
				collectionId: 'gone'
			},
			{ id: '3', title: '', url: 'doc/blank-q', updatedAt: 'not a date', collectionId: null },
			{
				id: '4',
				title: 'Fourth',
				url: '/doc/four',
				updatedAt: '2026-10-01T00:00:00Z',
				collectionId: null
			}
		],
		collections: { c1: 'Kitchen' }
	};

	it('links pages on the public address, whatever address the server asked', () => {
		expect(
			compendiumDocs(recent, 'https://compendium.niijimasisters.com/', now.getTime(), zone, 3)
		).toEqual([
			{
				title: 'Tea notes',
				href: 'https://compendium.niijimasisters.com/doc/tea-notes-Xk2b9QnLtZ',
				ago: '1 h ago',
				collection: 'Kitchen'
			},
			{
				title: 'Case files',
				href: 'https://compendium.niijimasisters.com/doc/case-files-AbC123#h-intro',
				ago: '1 min ago',
				collection: null
			},
			{
				title: 'Untitled',
				href: 'https://compendium.niijimasisters.com/doc/blank-q',
				ago: '',
				collection: null
			}
		]);
	});
});
