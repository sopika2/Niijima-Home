import { searchTarget } from '$lib/search.ts';
import { searchTemplate } from '$lib/server/config.ts';
import { runtime } from '$lib/server/runtime.ts';
import type { RequestHandler } from './$types';

/**
 * The search box without JavaScript: a plain GET form lands here and goes on to the address,
 * the bang or the search. (With JavaScript the page does this itself, without the round trip.)
 */
export const GET: RequestHandler = ({ url }) => {
	const { search } = runtime().config();
	const target = searchTarget(url.searchParams.get('q') ?? '', {
		template: searchTemplate(search),
		bangs: search.bangs
	});
	return new Response(null, {
		status: 303,
		headers: { location: target?.url ?? '/', 'cache-control': 'no-store' }
	});
};
