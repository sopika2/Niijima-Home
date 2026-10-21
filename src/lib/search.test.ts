import { describe, expect, it } from 'vitest';
import { addressOf, ENGINES, searchTarget } from './search.ts';

const ddg = { template: ENGINES.duckduckgo.url, bangs: true };

describe('search box: address, bang or search', () => {
	it('opens addresses and domains directly', () => {
		expect(searchTarget('example.com', ddg)).toEqual({
			kind: 'address',
			url: 'https://example.com/'
		});
		expect(searchTarget('  treasure.niijimasisters.com/accounts?x=1 ', ddg)).toEqual({
			kind: 'address',
			url: 'https://treasure.niijimasisters.com/accounts?x=1'
		});
		expect(searchTarget('http://example.org/a b', ddg)?.kind).toBe('search');
		expect(searchTarget('HTTP://Example.org/Path', ddg)).toEqual({
			kind: 'address',
			url: 'http://example.org/Path'
		});
		expect(searchTarget('bbc.co.uk', ddg)?.url).toBe('https://bbc.co.uk/');
		expect(searchTarget('bücher.de', ddg)?.kind).toBe('address');
	});

	it('uses plain http for home machines', () => {
		expect(addressOf('localhost:5173')).toBe('http://localhost:5173/');
		expect(addressOf('192.168.1.10')).toBe('http://192.168.1.10/');
		expect(addressOf('nas:5000/files')).toBe('http://nas:5000/files');
		expect(addressOf('printer.lan')).toBe('http://printer.lan/');
	});

	it('searches for things that only look a bit like domains', () => {
		for (const text of [
			'node.js',
			'hello',
			'hello world',
			'e.g.',
			'3.14',
			'999.1.1.1',
			'me@example.com',
			'mailto:x@y.z'
		]) {
			expect(searchTarget(text, ddg)?.kind, text).toBe('search');
		}
		// An unknown ending still opens when there's a path or port.
		expect(searchTarget('site.foo/page', ddg)?.kind).toBe('address');
	});

	it('never opens other schemes', () => {
		expect(searchTarget('javascript:alert(1)', ddg)?.kind).toBe('search');
		expect(searchTarget('file:///etc/passwd', ddg)?.kind).toBe('search');
		expect(searchTarget('javascript:alert(1)', ddg)?.url).toBe(
			'https://duckduckgo.com/?q=javascript%3Aalert(1)'
		);
	});

	it('passes bangs to DuckDuckGo, whatever the engine', () => {
		const google = { template: ENGINES.google.url, bangs: true };
		expect(searchTarget('!w tokyo', google)).toEqual({
			kind: 'bang',
			url: 'https://duckduckgo.com/?q=!w%20tokyo'
		});
		expect(searchTarget('persona 5 !yt', google)?.kind).toBe('bang');
		expect(searchTarget('hello!', google)?.kind).toBe('search');
		expect(searchTarget('wow ! nice', google)?.kind).toBe('search');
		expect(searchTarget('!w tokyo', { ...google, bangs: false })).toEqual({
			kind: 'search',
			url: 'https://www.google.com/search?q=!w%20tokyo'
		});
	});

	it('searches with the chosen engine or a custom template', () => {
		expect(searchTarget('a&b c', { template: ENGINES.startpage.url, bangs: true })?.url).toBe(
			'https://www.startpage.com/sp/search?query=a%26b%20c'
		);
		expect(
			searchTarget('x', { template: 'https://s.example/?q={q}&again={q}', bangs: false })?.url
		).toBe('https://s.example/?q=x&again=x');
	});

	it('forces a search with a leading "?" and ignores an empty box', () => {
		expect(searchTarget('? node.js', ddg)).toEqual({
			kind: 'search',
			url: 'https://duckduckgo.com/?q=node.js'
		});
		expect(searchTarget('?example.com', ddg)?.kind).toBe('search');
		expect(searchTarget('   ', ddg)).toBeNull();
		expect(searchTarget('?', ddg)).toBeNull();
	});
});
