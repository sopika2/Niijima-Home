import { describe, expect, it } from 'vitest';
import { weatherLabel, weatherWord } from './weather.ts';

describe('weather codes', () => {
	it('turns every WMO code into a short word', () => {
		const cases: [number, string][] = [
			[0, 'Sunny'],
			[1, 'Sunny'],
			[2, 'Cloudy'],
			[3, 'Overcast'],
			[45, 'Fog'],
			[48, 'Fog'],
			[51, 'Drizzle'],
			[55, 'Drizzle'],
			[56, 'Sleet'],
			[57, 'Sleet'],
			[61, 'Rain'],
			[65, 'Rain'],
			[66, 'Sleet'],
			[67, 'Sleet'],
			[71, 'Snow'],
			[77, 'Snow'],
			[80, 'Showers'],
			[82, 'Showers'],
			[85, 'Snow'],
			[86, 'Snow'],
			[95, 'Storm'],
			[96, 'Storm'],
			[99, 'Storm']
		];
		for (const [code, word] of cases) expect(weatherWord(code), String(code)).toBe(word);
	});

	it('says clear rather than sunny at night, and nothing for unknown codes', () => {
		expect(weatherWord(0, false)).toBe('Clear');
		expect(weatherWord(1, false)).toBe('Clear');
		expect(weatherWord(3, false)).toBe('Overcast');
		expect(weatherWord(42)).toBeNull();
		expect(weatherWord(2.5)).toBeNull();
	});

	it('builds the tag text', () => {
		expect(weatherLabel({ weather_code: 3, temperature_2m: 12.6, is_day: 1 })).toBe('Overcast 13°');
		expect(weatherLabel({ weather_code: 0, temperature_2m: -0.4, is_day: 0 })).toBe('Clear 0°');
		expect(weatherLabel({ weather_code: 42, temperature_2m: 7 })).toBe('7°');
		expect(weatherLabel({})).toBeNull();
		expect(weatherLabel(null)).toBeNull();
	});
});
