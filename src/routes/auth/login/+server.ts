import { redirect } from '@sveltejs/kit';
import { authorizeUrl } from '$lib/server/discord.ts';
import { ownHosts } from '$lib/server/hostsets.ts';
import { safeNext } from '$lib/server/next.ts';
import { isHttps } from '$lib/server/request.ts';
import { runtime } from '$lib/server/runtime.ts';
import { randomState } from '$lib/server/session.ts';
import type { RequestHandler } from './$types';

/**
 * The sign-in button: remembers where you were going, then sends you to Discord. Discord only
 * knows PUBLIC_URL's callback, so on makoto.… or sae.… this first hops over to PUBLIC_URL and
 * comes back afterwards (SESSION_DOMAIN makes the sign-in count on every host).
 */
export const GET: RequestHandler = (event) => {
	const { url, cookies } = event;
	const app = runtime();
	const access = app.access();
	if (!access.discord || !app.settings.publicUrl) redirect(303, '/');

	const home = new URL(app.settings.publicUrl);
	if (url.host !== home.host) {
		const back = `${home.protocol}//${url.host}${safeNext(url.searchParams.get('next'))}`;
		return new Response(null, {
			status: 303,
			headers: { location: `${home.origin}/auth/login?next=${encodeURIComponent(back)}` }
		});
	}

	const options = {
		path: '/auth',
		httpOnly: true,
		sameSite: 'lax',
		secure: isHttps(event),
		maxAge: 600
	} as const;
	const state = randomState();
	cookies.set('nj_oauth_state', state, options);
	cookies.set('nj_oauth_next', safeNext(url.searchParams.get('next'), ownHosts(app)), options);

	return new Response(null, {
		status: 303,
		headers: { location: authorizeUrl(access.discord, state) }
	});
};
