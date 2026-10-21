import { runtime } from '$lib/server/runtime.ts';
import type { LayoutServerLoad } from './$types';

/** What every page needs, signed in or not. */
export const load: LayoutServerLoad = ({ locals }) => {
	const app = runtime();
	return {
		title: app.config().title,
		persona: locals.persona,
		personaFixed: locals.personaFixed,
		user: locals.user,
		signIn: app.access().mode === 'discord'
	};
};
