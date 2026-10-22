import { building } from '$app/environment';
import type { Handle, ServerInit } from '@sveltejs/kit';
import { resolvePersona } from '$lib/server/hosts.ts';
import { isHttps } from '$lib/server/request.ts';
import { runtime } from '$lib/server/runtime.ts';
import { createSession, SESSION_COOKIE, sessionCookieOptions } from '$lib/server/session.ts';

/**
 * Reachable without signing in: the container health check, the sign-in screen and flow, and
 * the web app manifest (browsers fetch it without cookies when installing the page).
 */
const OPEN_PATHS = new Set([
	'/signin',
	'/healthz',
	'/manifest.webmanifest',
	'/auth/login',
	'/auth/callback',
	'/auth/logout'
]);

const SECURITY_HEADERS: Record<string, string> = {
	'x-content-type-options': 'nosniff',
	'x-frame-options': 'DENY',
	'referrer-policy': 'no-referrer',
	'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
	'cross-origin-opener-policy': 'same-origin'
};

export const init: ServerInit = () => {
	if (!building) runtime();
};

const FORM_TYPES = /^(application\/x-www-form-urlencoded|multipart\/form-data|text\/plain)/i;

export const handle: Handle = async ({ event, resolve }) => {
	const app = runtime();
	const config = app.config();
	const access = app.access();
	const { request, url } = event;

	// Form posts must come from a page on this same host. (SvelteKit's own check compares the
	// scheme too, which behind Traefik and Cloudflare isn't always the one the browser used.)
	if (
		!['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
		FORM_TYPES.test(request.headers.get('content-type') ?? '')
	) {
		const origin = request.headers.get('origin');
		let sameHost: boolean;
		try {
			sameHost = origin !== null && new URL(origin).host === url.host;
		} catch {
			sameHost = false;
		}
		if (!sameHost) {
			return new Response('Cross-site form posts are not allowed.', {
				status: 403,
				headers: SECURITY_HEADERS
			});
		}
	}

	const persona = resolvePersona(url.host, request.headers.get('cookie'), config.hosts);
	event.locals.persona = persona.persona;
	event.locals.personaFixed = persona.fixed;
	event.locals.user = null;

	if (!OPEN_PATHS.has(url.pathname) && access.mode === 'discord') {
		const user = access.verify(event.cookies);
		if (!user) {
			const wantsPage = request.method === 'GET' && !event.isDataRequest;
			if (wantsPage) {
				const target = url.pathname + url.search;
				const location = target === '/' ? '/signin' : `/signin?next=${encodeURIComponent(target)}`;
				return new Response(null, { status: 303, headers: { location, ...SECURITY_HEADERS } });
			}
			return new Response('Sign in first.', {
				status: 401,
				headers: { 'content-type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS }
			});
		}
		event.locals.user = { id: user.id, name: user.name };
		// Sliding sign-in: each visit pushes the expiry forward, so you only sign in once.
		if (user.renew) {
			event.cookies.set(
				SESSION_COOKIE,
				createSession(event.locals.user, access.sessionSecret),
				sessionCookieOptions(url.hostname, isHttps(event), app.settings.sessionDomain)
			);
		}
	}

	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replaceAll('%nj.persona%', event.locals.persona),
		// The two faces every page uses, so text doesn't reflow when they arrive.
		preload: ({ type, path }) =>
			type === 'js' ||
			type === 'css' ||
			(type === 'font' &&
				/(anton-latin-400|barlow-semi-condensed-latin-(600|700))-normal/.test(path))
	});
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!response.headers.has(name)) response.headers.set(name, value);
	}
	return response;
};
