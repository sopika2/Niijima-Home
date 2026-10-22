import type { Persona } from '@niijima/design';
import type { GroupView, LinkView } from '../types.ts';
import { assetUrl } from './art.ts';
import type { Config } from './config.ts';
import type { Favicons } from './favicons.ts';

const tone = (text: string) => {
	let hash = 0;
	for (const char of text) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
	return hash % 3;
};

/** Her own groups first, then the shared ones; the first nine links get the keys 1–9. */
export function linkGroups(
	config: Config,
	persona: Persona,
	options: { favicons: Pick<Favicons, 'has'>; assetsDir: string }
): GroupView[] {
	let key = 0;
	const groups = [
		...config.links[persona].map((group) => ({ group, owner: persona })),
		...config.links.shared.map((group) => ({ group, owner: 'shared' as const }))
	];
	return groups.map(({ group, owner }) => ({
		title: group.group,
		owner,
		links: group.links.map((link): LinkView => {
			const host = new URL(link.url).hostname.replace(/^www\./, '');
			let icon: string | null = null;
			if (link.icon.startsWith('/assets/')) icon = assetUrl(options.assetsDir, link.icon);
			else if (link.icon === 'auto' && options.favicons.has(link.url)) {
				icon = `/icon/${new URL(link.url).hostname.toLowerCase()}`;
			}
			key += 1;
			return {
				label: link.label,
				url: link.url,
				host,
				icon,
				letter: (Array.from(link.label.trim())[0] ?? '?').toUpperCase(),
				tone: tone(link.label),
				key: key <= 9 ? key : null
			};
		})
	}));
}
