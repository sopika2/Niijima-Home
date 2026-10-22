/**
 * Open-Meteo's weather codes (WMO 4677) as one short English word for the calendar's gold tag:
 * "SUNNY 18°". https://open-meteo.com/en/docs#weathervariables
 */
export function weatherWord(code: number, isDay = true): string | null {
	if (!Number.isInteger(code)) return null;
	if (code === 0 || code === 1) return isDay ? 'Sunny' : 'Clear';
	if (code === 2) return 'Cloudy';
	if (code === 3) return 'Overcast';
	if (code === 45 || code === 48) return 'Fog';
	if (code >= 51 && code <= 55) return 'Drizzle';
	if (code === 56 || code === 57 || code === 66 || code === 67) return 'Sleet';
	if (code >= 61 && code <= 65) return 'Rain';
	if (code >= 71 && code <= 77) return 'Snow';
	if (code >= 80 && code <= 82) return 'Showers';
	if (code === 85 || code === 86) return 'Snow';
	if (code === 95 || code === 96 || code === 99) return 'Storm';
	return null;
}

export interface CurrentWeather {
	readonly weather_code?: number | null;
	readonly temperature_2m?: number | null;
	readonly is_day?: number | null;
}

/** "Cloudy 13°", "Rain 7°", or just "13°" for a code we don't know. Null when there's nothing. */
export function weatherLabel(current: CurrentWeather | null | undefined): string | null {
	if (!current) return null;
	const word =
		typeof current.weather_code === 'number'
			? weatherWord(current.weather_code, current.is_day !== 0)
			: null;
	const temperature =
		typeof current.temperature_2m === 'number' && Number.isFinite(current.temperature_2m)
			? `${Math.round(current.temperature_2m) === 0 ? 0 : Math.round(current.temperature_2m)}°`
			: null;
	const label = [word, temperature].filter(Boolean).join(' ');
	return label || null;
}
