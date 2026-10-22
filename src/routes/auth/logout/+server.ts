import { redirect } from '@sveltejs/kit';
import { isHttps } from '$lib/server/request.ts';
import { runtime } from '$lib/server/runtime.ts';
import { SESSION_COOKIE, sessionCookieOptions } from '$lib/server/session.ts';
import type { RequestHandler } from './$types';

/** Signs you out on this device (on every Niijima site sharing the sign-in). */
export const POST: RequestHandler = (event) => {
	const app = runtime();
	const { path, domain } = sessionCookieOptions(
		event.url.hostname,
		isHttps(event),
		app.settings.sessionDomain
	);
	event.cookies.delete(SESSION_COOKIE, { path, ...(domain ? { domain } : {}) });
	redirect(303, app.access().mode === 'off' ? '/' : '/signin?m=signed_out');
};
