import type { Money } from './types.ts';

/** "−12,480 Ft" / "€29.99" as one string. */
export function moneyText(value: Money): string {
	const sign = value.negative ? '\u2212' : '';
	return value.symbolFirst
		? `${sign}${value.symbol}${value.amount}`
		: `${sign}${value.amount}\u00a0${value.symbol}`;
}
