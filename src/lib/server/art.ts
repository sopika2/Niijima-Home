import { statSync } from 'node:fs';
import { resolve, sep } from 'node:path';

/**
 * The address of a picture in ./assets, with its change time so an updated file shows at once,
 * or null when it isn't there (the page then draws a placeholder, never a broken image). A
 * missing .webp falls back to the .png of the same name.
 */
export function assetUrl(assetsDir: string, path: string | null | undefined): string | null {
	if (!path?.startsWith('/assets/')) return null;
	const tries = [path];
	if (/\.webp$/i.test(path)) tries.push(path.replace(/\.webp$/i, '.png'));
	for (const candidate of tries) {
		const file = resolve(assetsDir, candidate.slice('/assets/'.length));
		if (!file.startsWith(assetsDir + sep)) continue;
		try {
			const info = statSync(file);
			if (info.isFile()) return `${candidate}?v=${Math.floor(info.mtimeMs).toString(36)}`;
		} catch {
			// Not there: try the next one.
		}
	}
	return null;
}
