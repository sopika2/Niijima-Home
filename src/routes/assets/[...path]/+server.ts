import { error } from '@sveltejs/kit';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { runtime } from '$lib/server/runtime.ts';
import type { RequestHandler } from './$types';

const TYPES: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	avif: 'image/avif',
	gif: 'image/gif',
	svg: 'image/svg+xml'
};

/**
 * Your own pictures (the host characters' art, custom link icons) from the mounted ./assets
 * folder, so no art ever has to live in git. Behind the same sign-in as the page.
 */
export const GET: RequestHandler = async ({ params }) => {
	const match = /\.([a-z0-9]+)$/i.exec(params.path);
	const type = match ? TYPES[match[1]!.toLowerCase()] : undefined;
	if (!type || params.path.split('/').some((part) => part.startsWith('.'))) error(404, 'Not found');

	const root = runtime().paths.assets;
	const file = resolve(root, params.path);
	if (!file.startsWith(root + sep)) error(404, 'Not found');
	try {
		const [body, info] = await Promise.all([readFile(file), stat(file)]);
		return new Response(new Uint8Array(body), {
			headers: {
				'content-type': type,
				'cache-control': 'private, max-age=86400',
				'last-modified': info.mtime.toUTCString(),
				'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox"
			}
		});
	} catch {
		error(404, 'Not found');
	}
};
