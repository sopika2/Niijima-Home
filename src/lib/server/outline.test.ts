import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultConfig } from './config.ts';
import { recentDocuments } from './outline.ts';
import type { Runtime } from './runtime.ts';
import { compendiumGlance } from './sources.ts';
import { HttpError, Upstream } from './upstream.ts';

const BASE = 'http://outline:3000';
const TOKEN = 'ol_api_0123456789abcdefghijklmnopqrstuvwxyzAB';

const documents = {
	data: [
		{
			id: 'd1',
			title: 'Tea notes',
			url: '/doc/tea-notes-Xk2b9QnLtZ',
			updatedAt: '2026-10-22T09:00:00.000Z',
			collectionId: 'c1',
			text: '…a long body the page never needs…'
		},
		{
			id: 'd2',
			title: '',
			url: '/doc/untitled-a1B2c3D4e5',
			updatedAt: '2026-10-20T09:00:00.000Z',
			collectionId: null
		}
	],
	pagination: { offset: 0, limit: 5 },
	policies: []
};
const collections = { data: [{ id: 'c1', name: 'Kitchen', color: '#FF0000' }] };

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** A fetch that answers Outline's two methods. */
function outline(answers: Record<string, () => Response | Promise<Response>>) {
	const calls: { url: string; init: RequestInit }[] = [];
	const fetch = vi.fn(async (url: string, init: RequestInit) => {
		calls.push({ url, init });
		const method = url.split('/api/')[1]!;
		const answer = answers[method];
		if (!answer) return json({ ok: false, error: 'not_found' }, 404);
		return answer();
	});
	vi.stubGlobal('fetch', fetch);
	return calls;
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe('Outline client', () => {
	it('asks documents.list for the newest pages with the API key, and names their collections', async () => {
		const calls = outline({
			'documents.list': () => json(documents),
			'collections.list': () => json(collections)
		});
		const recent = await recentDocuments(`${BASE}/`, TOKEN, 5, new AbortController().signal);

		const list = calls.find((call) => call.url === `${BASE}/api/documents.list`)!;
		expect(list.init.method).toBe('POST');
		expect(list.init.headers).toMatchObject({
			authorization: `Bearer ${TOKEN}`,
			'content-type': 'application/json',
			accept: 'application/json'
		});
		expect(JSON.parse(String(list.init.body))).toEqual({
			sort: 'updatedAt',
			direction: 'DESC',
			limit: 5
		});
		expect(recent.documents).toEqual([
			{
				id: 'd1',
				title: 'Tea notes',
				url: '/doc/tea-notes-Xk2b9QnLtZ',
				updatedAt: '2026-10-22T09:00:00.000Z',
				collectionId: 'c1'
			},
			{
				id: 'd2',
				title: '',
				url: '/doc/untitled-a1B2c3D4e5',
				updatedAt: '2026-10-20T09:00:00.000Z',
				collectionId: null
			}
		]);
		expect(recent.collections).toEqual({ c1: 'Kitchen' });
	});

	it('still lists the pages when the key may not list collections', async () => {
		outline({
			'documents.list': () => json(documents),
			'collections.list': () => json({ ok: false, error: 'authorization_error' }, 403)
		});
		const recent = await recentDocuments(BASE, TOKEN, 5, new AbortController().signal);
		expect(recent.documents).toHaveLength(2);
		expect(recent.collections).toEqual({});
	});

	it('fails on a bad token', async () => {
		outline({
			'documents.list': () => json({ ok: false, error: 'authentication_required' }, 401),
			'collections.list': () => json({ ok: false, error: 'authentication_required' }, 401)
		});
		const failure = recentDocuments(BASE, 'wrong', 5, new AbortController().signal);
		await expect(failure).rejects.toBeInstanceOf(HttpError);
		await expect(failure).rejects.toMatchObject({ status: 401 });
	});

	it('fails on an answer that is not a document list', async () => {
		outline({
			'documents.list': () => json({ ok: true, data: 'nope' }),
			'collections.list': () => json(collections)
		});
		await expect(recentDocuments(BASE, TOKEN, 5, new AbortController().signal)).rejects.toThrow();
	});
});

/** Just enough of the app for one source. */
function app(settings: Partial<Runtime['settings']>, upstream = new Upstream()): Runtime {
	return {
		settings: {
			outlineUrl: BASE,
			outlinePublicUrl: 'https://compendium.niijimasisters.com',
			outlineToken: TOKEN,
			...settings
		},
		upstream
	} as unknown as Runtime;
}

describe('Compendium slot', () => {
	const config = defaultConfig();
	const now = new Date('2026-10-22T12:00:00Z');

	it('links each page on the public address', async () => {
		outline({
			'documents.list': () => json(documents),
			'collections.list': () => json(collections)
		});
		const panel = await compendiumGlance(app({}), config, now);
		expect(panel).toMatchObject({
			state: 'ok',
			value: [
				{
					title: 'Tea notes',
					href: 'https://compendium.niijimasisters.com/doc/tea-notes-Xk2b9QnLtZ',
					ago: '3 h ago',
					collection: 'Kitchen'
				},
				{ title: 'Untitled', ago: '2 days ago', collection: null }
			]
		});
	});

	it('is off without a token, and never asks', async () => {
		const calls = outline({});
		expect(await compendiumGlance(app({ outlineToken: null }), config, now)).toEqual({
			state: 'off',
			hint: 'Add OUTLINE_TOKEN to .env.'
		});
		expect(calls).toHaveLength(0);
	});

	it('names the token when Outline refuses it', async () => {
		outline({
			'documents.list': () => json({ ok: false, error: 'authentication_required' }, 401)
		});
		expect(await compendiumGlance(app({}), config, now)).toEqual({
			state: 'unavailable',
			hint: 'Compendium refused the token: check OUTLINE_TOKEN in .env.'
		});
	});

	it('gives up after the page deadline when Outline is slow, without holding the page', async () => {
		vi.useFakeTimers();
		outline({
			'documents.list': () => new Promise<Response>(() => {}),
			'collections.list': () => new Promise<Response>(() => {})
		});
		const pending = compendiumGlance(app({}), config, now);
		await vi.advanceTimersByTimeAsync(1_500);
		expect(await pending).toEqual({
			state: 'unavailable',
			hint: "Compendium didn't answer in time."
		});
	});

	it('counts a request past the hard limit as a timeout and aborts it', async () => {
		vi.useFakeTimers();
		let signal: AbortSignal | undefined;
		vi.stubGlobal(
			'fetch',
			vi.fn(
				(_url: string, init: RequestInit) =>
					new Promise<Response>((_resolve, reject) => {
						signal = init.signal!;
						signal.addEventListener('abort', () => reject(signal!.reason));
					})
			)
		);
		const upstream = new Upstream({ wait: 100, limit: 1_000 });
		const first = compendiumGlance(app({}, upstream), config, now);
		await vi.advanceTimersByTimeAsync(100);
		expect(await first).toMatchObject({ state: 'unavailable' });
		await vi.advanceTimersByTimeAsync(900);
		expect(signal?.aborted).toBe(true);
		expect(await compendiumGlance(app({}, upstream), config, now)).toEqual({
			state: 'unavailable',
			hint: "Compendium didn't answer in time."
		});
	});
});
