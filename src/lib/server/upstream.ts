/**
 * Every outside answer the page shows (weather, service checks, Calendar, Treasure) goes through
 * here, so the page opens instantly: a good answer is reused for a minute, the page never waits
 * longer than `wait` for a new one, and when an upstream is slow or down the section says so
 * (or shows the last good answer) instead of holding up the whole page. A request that misses
 * the page keeps going in the background, so the next visit gets it.
 */

export type Fetched<T> =
	| {
			readonly ok: true;
			readonly value: T;
			/** When the value was fetched (ms since 1970). */
			readonly at: number;
			/** True when a refresh failed or is late and this is the last good answer. */
			readonly stale: boolean;
	  }
	| {
			readonly ok: false;
			/** late: still being asked, past the page's wait; timeout: gave up; error: it failed. */
			readonly reason: 'late' | 'timeout' | 'error';
			readonly detail: string;
	  };

export interface UpstreamOptions {
	/** How long a good answer is reused, ms. */
	readonly ttl: number;
	/** The longest a page waits for a fresh answer, ms. */
	readonly wait: number;
	/** The longest a request may run at all (then it is aborted), ms. */
	readonly limit: number;
	/** How long a failure is remembered before asking again, ms. */
	readonly retry: number;
	/** How old the last good answer may be and still stand in for a failed refresh, ms. */
	readonly keepStale: number;
	readonly now?: () => number;
	/** Told about each failed request, e.g. to log it. */
	readonly onError?: (key: string, detail: string) => void;
}

export const DEFAULT_UPSTREAM: UpstreamOptions = {
	ttl: 60_000,
	wait: 1_500,
	limit: 8_000,
	retry: 15_000,
	keepStale: 30 * 60_000
};

interface Entry {
	value?: unknown;
	at?: number;
	failure?: { at: number; reason: 'timeout' | 'error'; detail: string };
	pending?: Promise<void>;
	/** When the pending request started. */
	since?: number;
}

/** Thrown into the request's signal when it runs past `limit`. */
export class UpstreamTimeout extends Error {
	constructor(ms: number) {
		super(`no answer within ${ms} ms`);
		this.name = 'UpstreamTimeout';
	}
}

export class Upstream {
	readonly #options: UpstreamOptions;
	readonly #entries = new Map<string, Entry>();

	constructor(options: Partial<UpstreamOptions> = {}) {
		this.#options = { ...DEFAULT_UPSTREAM, ...options };
	}

	#now(): number {
		return this.#options.now?.() ?? Date.now();
	}

	/**
	 * The answer for `key`: from memory while it is fresh, otherwise from `load` if it answers
	 * within `wait`. `load` gets a signal that aborts after `limit`; pass it on to fetch().
	 */
	async get<T>(key: string, load: (signal: AbortSignal) => Promise<T>): Promise<Fetched<T>> {
		let entry = this.#entries.get(key);
		if (!entry) this.#entries.set(key, (entry = {}));
		const { ttl, retry, wait } = this.#options;

		if (entry.at !== undefined && this.#now() - entry.at < ttl) return this.#good<T>(entry, false);
		if (entry.failure && this.#now() - entry.failure.at < retry) {
			return this.#fallback<T>(entry, entry.failure.reason, entry.failure.detail);
		}

		if (!entry.pending) {
			entry.since = this.#now();
			entry.pending = this.#refresh(key, entry, load);
		}
		// Pages that arrive while a request is already out share its deadline: nobody waits
		// longer than `wait` after the request started.
		const left = Math.max(0, wait - (this.#now() - entry.since!));
		const settled = left > 0 && (await within(entry.pending, left));
		if (!settled) return this.#fallback<T>(entry, 'late', `no answer within ${wait} ms`);
		if (entry.failure) return this.#fallback<T>(entry, entry.failure.reason, entry.failure.detail);
		return this.#good<T>(entry, false);
	}

	/** Forgets everything (tests, or after config.yml changes). */
	clear(): void {
		this.#entries.clear();
	}

	#refresh<T>(key: string, entry: Entry, load: (signal: AbortSignal) => Promise<T>): Promise<void> {
		const { limit } = this.#options;
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(new UpstreamTimeout(limit)), limit);
		let promise: Promise<T>;
		try {
			promise = load(controller.signal);
		} catch (error) {
			promise = Promise.reject(error);
		}
		return promise
			.then(
				(value) => {
					entry.value = value;
					entry.at = this.#now();
					entry.failure = undefined;
				},
				(error: unknown) => {
					const timedOut = controller.signal.aborted;
					const detail = timedOut
						? `no answer within ${limit} ms`
						: error instanceof Error
							? error.message
							: String(error);
					entry.failure = { at: this.#now(), reason: timedOut ? 'timeout' : 'error', detail };
					this.#options.onError?.(key, detail);
				}
			)
			.finally(() => {
				clearTimeout(timer);
				entry.pending = undefined;
			});
	}

	#good<T>(entry: Entry, stale: boolean): Fetched<T> {
		return { ok: true, value: entry.value as T, at: entry.at!, stale };
	}

	#fallback<T>(entry: Entry, reason: 'late' | 'timeout' | 'error', detail: string): Fetched<T> {
		if (entry.at !== undefined && this.#now() - entry.at < this.#options.keepStale) {
			return this.#good<T>(entry, true);
		}
		return { ok: false, reason, detail };
	}
}

/** True if `promise` settles within `ms`, false if the time runs out first. Never rejects. */
function within(promise: Promise<unknown>, ms: number): Promise<boolean> {
	return new Promise((resolve) => {
		const timer = setTimeout(() => resolve(false), ms);
		promise.then(
			() => {
				clearTimeout(timer);
				resolve(true);
			},
			() => {
				clearTimeout(timer);
				resolve(true);
			}
		);
	});
}

/** An HTTP answer outside 2xx. */
export class HttpError extends Error {
	readonly status: number;
	constructor(status: number, url: string) {
		super(`HTTP ${status} from ${new URL(url).host}`);
		this.name = 'HttpError';
		this.status = status;
	}
}

/**
 * GET some JSON, with a bearer token if given; with a `body`, POST it as JSON instead (Outline's
 * API is all POST). Throws HttpError for anything but 2xx.
 */
export async function fetchJson(
	url: string,
	options: { signal: AbortSignal; token?: string | undefined; body?: unknown }
): Promise<unknown> {
	const post = options.body !== undefined;
	const response = await fetch(url, {
		method: post ? 'POST' : 'GET',
		signal: options.signal,
		headers: {
			accept: 'application/json',
			...(post ? { 'content-type': 'application/json' } : {}),
			...(options.token ? { authorization: `Bearer ${options.token}` } : {})
		},
		...(post ? { body: JSON.stringify(options.body) } : {})
	});
	if (!response.ok) {
		await response.body?.cancel();
		throw new HttpError(response.status, url);
	}
	return response.json();
}
