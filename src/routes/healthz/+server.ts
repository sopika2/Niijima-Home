import { json } from '@sveltejs/kit';
import { runtime } from '$lib/server/runtime.ts';
import type { RequestHandler } from './$types';

/** For the container health check. Answers without asking any upstream, so it's always quick. */
export const GET: RequestHandler = () => {
	const app = runtime();
	app.config(); // picks up (or reports) config.yml edits
	return json({ status: 'ok', version: app.version }, { headers: { 'cache-control': 'no-store' } });
};
