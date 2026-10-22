import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultConfig, parseConfig, searchTemplate } from './config.ts';

describe('config.yml', () => {
	it('accepts config.example.yml as shipped', () => {
		const config = parseConfig(
			readFileSync(new URL('../../../config.example.yml', import.meta.url), 'utf8')
		);
		expect(config.hosts).toEqual({
			'makoto.niijimasisters.com': 'makoto',
			'sae.niijimasisters.com': 'sae'
		});
		expect(config.network.length).toBeGreaterThan(3);
		expect(config.links.shared.length).toBeGreaterThan(0);
	});

	it('has sensible defaults for an empty file', () => {
		const config = defaultConfig();
		expect(config.sections).toEqual(['search', 'strip', 'network', 'links']);
		expect(config.strip).toEqual({
			slots: ['calendar', 'treasure', 'compendium'],
			events: 3,
			documents: 5
		});
		expect(searchTemplate(config.search)).toBe('https://duckduckgo.com/?q={q}');
		expect(config.host.sae.lines.night.length).toBeGreaterThan(0);
		expect(config.network.map((service) => service.id)).toContain('treasure');
	});

	it('names the setting that is wrong', () => {
		expect(() => parseConfig('search: { engine: custom }')).toThrow(/search.url/);
		expect(() => parseConfig('sections: [links, links]')).toThrow(/sections/);
		expect(() => parseConfig('strip: { slots: [treasure, treasure] }')).toThrow(/strip.slots/);
		expect(() => parseConfig('strip: { slots: [wiki] }')).toThrow(/strip.slots/);
		expect(() => parseConfig('hosts: { "sae.x.com": akechi }')).toThrow(/hosts/);
		expect(() =>
			parseConfig('links: { shared: [{ group: A, links: [{ label: x, url: "ftp://x" }] }] }')
		).toThrow(/links.shared.0.links.0.url/);
		expect(() => parseConfig('colour: red')).toThrow(/colour|Unrecognized/);
		expect(() => parseConfig('a: [')).toThrow(/not valid YAML/);
	});

	it('lets the strip be reordered, trimmed, or joined by the big sections', () => {
		const config = parseConfig(
			'sections: [search, strip, links, today]\nstrip: { slots: [compendium, calendar] }'
		);
		expect(config.sections).toEqual(['search', 'strip', 'links', 'today']);
		expect(config.strip.slots).toEqual(['compendium', 'calendar']);
	});

	it('keeps long Discord ids exact', () => {
		const config = parseConfig('access: { discord_user_ids: [123456789012345678901] }');
		expect(config.access.discord_user_ids).toEqual(['123456789012345678901']);
	});
});
