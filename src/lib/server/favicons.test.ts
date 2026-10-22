import { describe, expect, it } from 'vitest';
import { iconCandidates, sniff } from './favicons.ts';

describe('favicons', () => {
	it('prefers a sharp icon, then SVG, then the apple-touch icon, with /favicon.ico last', () => {
		const html = `<html><head>
			<link rel="shortcut icon" href="/old.ico">
			<link rel="apple-touch-icon" href="/apple.png">
			<link rel="icon" type="image/svg+xml" href="/icon.svg">
			<link href='/i64.png' rel=icon sizes="64x64">
			<link rel="icon" href="data:image/png;base64,xx">
			<link rel="stylesheet" href="/x.css">
		</head><body><link rel="icon" href="/body.png"></body></html>`;
		expect(iconCandidates(html, 'https://example.com/start')).toEqual([
			'https://example.com/i64.png',
			'https://example.com/icon.svg',
			'https://example.com/apple.png',
			'https://example.com/old.ico',
			'https://example.com/favicon.ico'
		]);
	});

	it('tells what a file really is from its first bytes', () => {
		expect(sniff(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png');
		expect(sniff(Buffer.from([0, 0, 1, 0, 1, 0]))).toBe('ico');
		expect(sniff(Buffer.from('  <svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe('svg');
		expect(sniff(Buffer.from('<!doctype html><html>'))).toBeNull();
	});
});
