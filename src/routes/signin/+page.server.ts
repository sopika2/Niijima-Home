import { redirect } from '@sveltejs/kit';
import { safeNext } from '$lib/server/next.ts';
import { runtime } from '$lib/server/runtime.ts';
import type { PageServerLoad } from './$types';

const MESSAGES = new Set(['signed_out', 'expired', 'failed', 'refused']);

export const load: PageServerLoad = ({ url, cookies }) => {
	const app = runtime();
	const config = app.config();
	const access = app.access();
	const next = safeNext(url.searchParams.get('next'));
	if (access.mode === 'off' || access.verify(cookies)) redirect(303, next);

	const message = url.searchParams.get('m');
	const id = url.searchParams.get('id');
	return {
		next,
		timezone: config.timezone,
		message: message && MESSAGES.has(message) ? message : null,
		refusedId: id && /^\d{15,21}$/.test(id) ? id : null
	};
};
