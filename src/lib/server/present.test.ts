import { describe, expect, it } from 'vitest';
import { defaultConfig } from './config.ts';
import { moneyText } from '../money.ts';
import { agenda, dayPart, greetingLine, money } from './present.ts';

const zone = 'Europe/Budapest';
const now = new Date('2026-10-21T10:00:00Z'); // 12:00 in Budapest

describe('agenda', () => {
	it('groups events by day in the configured time zone, skipping what is over', () => {
		const days = agenda(
			[
				{
					title: 'Later',
					start: '2026-10-23T08:00:00Z',
					end: '2026-10-23T09:00:00Z',
					owner: 'sae'
				},
				{ title: 'Over', start: '2026-10-21T06:00:00Z', end: '2026-10-21T07:00:00Z' },
				{
					title: 'Lunch',
					start: '2026-10-21T11:00:00Z',
					end: '2026-10-21T12:00:00Z',
					location: ' Café '
				},
				{ title: 'Exam', start: '2026-10-22', end: '2026-10-23', allDay: true, owner: 'makoto' },
				{ title: 'Late night', start: '2026-10-21T22:30:00Z' }
			],
			now,
			zone,
			10
		);
		expect(days.map((day) => [day.label, day.events.map((event) => event.title)])).toEqual([
			['Today', ['Lunch']],
			['Tomorrow', ['Exam', 'Late night']],
			['Fri 23 Oct', ['Later']]
		]);
		expect(days[0]!.events[0]).toEqual({
			title: 'Lunch',
			time: '13:00',
			end: '14:00',
			location: 'Café',
			owner: 'shared'
		});
		expect(days[1]!.events[0]!.time).toBeNull();
		expect(days[1]!.events[1]!.time).toBe('00:30');
	});

	it('shows something that is going on now under today, and respects the limit', () => {
		const days = agenda(
			[
				{ title: 'Trip', start: '2026-10-19', end: '2026-10-24', allDay: true },
				{ title: 'Meeting', start: '2026-10-20T09:00:00Z', end: '2026-10-21T11:00:00Z' },
				{ title: 'Next', start: '2026-10-25T09:00:00Z' }
			],
			now,
			zone,
			2
		);
		expect(days).toEqual([
			{
				key: '2026-10-21',
				label: 'Today',
				events: [
					{ title: 'Trip', time: null, end: null, location: null, owner: 'shared' },
					{ title: 'Meeting', time: 'Now', end: null, location: null, owner: 'shared' }
				]
			}
		]);
	});
});

describe('money', () => {
	it('shows forints after the amount, in whole forints', () => {
		expect(money(301958150, 'HUF')).toEqual({
			amount: '3,019,582',
			symbol: 'Ft',
			symbolFirst: false,
			negative: false
		});
		expect(moneyText(money(-1248000, 'HUF'))).toBe('−12,480 Ft');
	});
	it('shows euros with cents, symbol first', () => {
		expect(moneyText(money(-2999, 'EUR'))).toBe('−€29.99');
		expect(money(-0, 'EUR').negative).toBe(false);
	});
});

describe('greeting', () => {
	it('picks a line for the time of day, falling back to "any"', () => {
		const host = defaultConfig().host.makoto;
		expect(dayPart(4)).toBe('night');
		expect(dayPart(5)).toBe('morning');
		expect(dayPart(12)).toBe('afternoon');
		expect(dayPart(21)).toBe('evening');
		expect(greetingLine(host, 8, () => 0)).toBe(host.lines.morning[0]);
		const quiet = { ...host, lines: { ...host.lines, night: [] } };
		expect(greetingLine(quiet, 23, () => 0.99)).toBe(host.lines.any[0]);
	});
});
