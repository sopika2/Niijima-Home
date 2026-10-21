import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Upstream } from './upstream.ts';

const options = { ttl: 60_000, wait: 1_500, limit: 8_000, retry: 15_000, keepStale: 1_800_000 };

/** A load function whose answers the test hands out. */
function controlled<T>() {
	const calls: {
		resolve: (value: T) => void;
		reject: (error: Error) => void;
		signal: AbortSignal;
	}[] = [];
	const load = vi.fn(
		(signal: AbortSignal) =>
			new Promise<T>((resolve, reject) => {
				calls.push({ resolve, reject, signal });
				signal.addEventListener('abort', () => reject(new Error('aborted')));
			})
	);
	return { load, calls };
}

describe('upstream cache', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('reuses a good answer for a minute, then asks again', async () => {
		const cache = new Upstream(options);
		const load = vi.fn(async () => 'sunny');
		expect(await cache.get('wx', load)).toMatchObject({ ok: true, value: 'sunny', stale: false });
		await vi.advanceTimersByTimeAsync(59_000);
		await cache.get('wx', load);
		expect(load).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(2_000);
		await cache.get('wx', load);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('asks once when several pages want the same thing at once', async () => {
		const cache = new Upstream(options);
		const { load, calls } = controlled<number>();
		const pages = [cache.get('k', load), cache.get('k', load), cache.get('k', load)];
		calls[0]!.resolve(7);
		expect(await Promise.all(pages)).toMatchObject([{ value: 7 }, { value: 7 }, { value: 7 }]);
		expect(load).toHaveBeenCalledTimes(1);
	});

	it('never waits more than 1.5 s, and keeps the late answer for the next page', async () => {
		const cache = new Upstream(options);
		const { load, calls } = controlled<string>();
		const page = cache.get('slow', load);
		await vi.advanceTimersByTimeAsync(1_500);
		expect(await page).toEqual({ ok: false, reason: 'late', detail: 'no answer within 1500 ms' });

		// A page arriving while that request is still out doesn't wait again.
		await vi.advanceTimersByTimeAsync(500);
		expect(await cache.get('slow', load)).toMatchObject({ ok: false, reason: 'late' });

		calls[0]!.resolve('finally');
		await vi.advanceTimersByTimeAsync(0);
		expect(await cache.get('slow', load)).toMatchObject({
			ok: true,
			value: 'finally',
			stale: false
		});
		expect(load).toHaveBeenCalledTimes(1);
	});

	it('aborts a request that runs past the hard limit and remembers the failure', async () => {
		const cache = new Upstream(options);
		const { load, calls } = controlled<string>();
		void cache.get('hung', load);
		await vi.advanceTimersByTimeAsync(8_000);
		expect(calls[0]!.signal.aborted).toBe(true);
		expect(await cache.get('hung', load)).toMatchObject({ ok: false, reason: 'timeout' });
		expect(load).toHaveBeenCalledTimes(1); // not asked again within `retry`
		await vi.advanceTimersByTimeAsync(15_000);
		void cache.get('hung', load);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('shows the last good answer when a refresh fails, until it is too old', async () => {
		const errors: string[] = [];
		const cache = new Upstream({
			...options,
			onError: (key, detail) => errors.push(`${key}: ${detail}`)
		});
		await cache.get('money', async () => 100);
		await vi.advanceTimersByTimeAsync(61_000);
		const failing = vi.fn(async () => {
			throw new Error('HTTP 502 from treasure');
		});
		expect(await cache.get('money', failing)).toMatchObject({ ok: true, value: 100, stale: true });
		expect(errors).toEqual(['money: HTTP 502 from treasure']);

		await vi.advanceTimersByTimeAsync(1_800_000);
		expect(await cache.get('money', failing)).toEqual({
			ok: false,
			reason: 'error',
			detail: 'HTTP 502 from treasure'
		});
	});

	it('counts a load that throws straight away as a failure', async () => {
		const cache = new Upstream(options);
		const result = await cache.get('bad', () => {
			throw new Error('boom');
		});
		expect(result).toEqual({ ok: false, reason: 'error', detail: 'boom' });
	});
});
