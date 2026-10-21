import { error } from '@sveltejs/kit';
import { runtime } from '$lib/server/runtime.ts';
import type { RequestHandler } from './$types';

/**
 * A link's icon from the disk cache. Served with a sandboxing policy, so an SVG icon can never
 * run script on this site even if opened directly.
 */
export const GET: RequestHandler = async ({ params }) => {
	const icon = await runtime().favicons.read(params.host.toLowerCase());
	if (!icon) error(404, 'Not found');
	return new Response(new Uint8Array(icon.body), {
		headers: {
			'content-type': icon.type,
			'cache-control': 'private, max-age=86400',
			'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
			'x-content-type-options': 'nosniff'
		}
	});
};
