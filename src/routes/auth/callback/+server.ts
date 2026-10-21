import { redirect } from '@sveltejs/kit';
import { userFromCode } from '$lib/server/discord.ts';
import { ownHosts } from '$lib/server/hostsets.ts';
import { log, messageOf } from '$lib/server/log.ts';
import { safeNext } from '$lib/server/next.ts';
import { isHttps } from '$lib/server/request.ts';
import { runtime } from '$lib/server/runtime.ts';
import { createSession, SESSION_COOKIE, sessionCookieOptions } from '$lib/server/session.ts';
import type { RequestHandler } from './$types';

/** Discord sends you back here. Problems go back to the sign-in screen with a message. */
export const GET: RequestHandler = async (event) => {
	const { url, cookies } = event;
	const app = runtime();
	const access = app.access();
	if (!access.discord) redirect(303, '/');

	const expected = cookies.get('nj_oauth_state');
	const next = safeNext(cookies.get('nj_oauth_next'), ownHosts(app));
	cookies.delete('nj_oauth_state', { path: '/auth' });
	cookies.delete('nj_oauth_next', { path: '/auth' });

	const code = url.searchParams.get('code');
	if (!code || !expected || url.searchParams.get('state') !== expected) {
		redirect(303, '/signin?m=expired');
	}

	let user;
	try {
		user = await userFromCode(access.discord, code);
	} catch (error) {
		log('auth', `Discord sign-in failed: ${messageOf(error)}`);
		redirect(303, '/signin?m=failed');
	}

	if (!access.allows(user.id)) {
		log('auth', `refused Discord account ${user.id} (${user.name})`);
		redirect(303, `/signin?m=refused&id=${user.id}`);
	}

	cookies.set(
		SESSION_COOKIE,
		createSession(user, access.sessionSecret),
		sessionCookieOptions(url.hostname, isHttps(event), app.settings.sessionDomain)
	);
	log('auth', `signed in: ${user.name}`);
	return new Response(null, { status: 303, headers: { location: next } });
};
