import type { Money } from './types.ts';

/** "−12,480 Ft" / "€29.99" as one string. */
export function moneyText(value: Money): string {
	const sign = value.negative ? '\u2212' : '';
	return value.symbolFirst
		? `${sign}${value.symbol}${value.amount}`
		: `${sign}${value.amount}\u00a0${value.symbol}`;
}

/** Shows or hides every amount on the page, remembered on this device (see app.html). */
export function toggleMoney(): void {
	const root = document.documentElement;
	const next = root.dataset.money === 'hidden' ? 'shown' : 'hidden';
	root.dataset.money = next;
	try {
		localStorage.setItem('nj-home:money', next);
	} catch {
		// Storage blocked: it still switches for now.
	}
}
