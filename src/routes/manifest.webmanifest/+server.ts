import { runtime } from '$lib/server/runtime.ts';
import type { RequestHandler } from './$types';

/**
 * The web app manifest, so the page installs nicely on a phone ("Add to Home screen"): on a
 * sister's own host it's her start page, with her colours and icon.
 */
export const GET: RequestHandler = ({ locals }) => {
	const { title } = runtime().config();
	const who = locals.personaFixed ? locals.persona : null;
	const name = who === 'makoto' ? `Makoto · ${title}` : who === 'sae' ? `Sae · ${title}` : title;
	const icon = who ?? 'home';
	const theme = who === 'sae' ? '#6e0014' : who === 'makoto' ? '#12151f' : '#0b0b0d';
	const manifest = {
		name,
		short_name: who === 'makoto' ? 'Makoto' : who === 'sae' ? 'Sae' : 'Home',
		description: 'The Niijima Network start page.',
		id: '/',
		start_url: '/',
		scope: '/',
		display: 'standalone',
		orientation: 'any',
		background_color: '#0b0b0d',
		theme_color: theme,
		icons: [
			{ src: `/icons/${icon}-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
			{ src: `/icons/${icon}-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
			{
				src: `/icons/${icon}-maskable.png`,
				sizes: '512x512',
				type: 'image/png',
				purpose: 'maskable'
			}
		]
	};
	return new Response(JSON.stringify(manifest, null, '\t'), {
		headers: { 'content-type': 'application/manifest+json', 'cache-control': 'no-cache' }
	});
};
