import { describe, expect, it } from 'vitest';
import { safeNext } from './next.ts';

const own = ['home.niijimasisters.com', 'makoto.niijimasisters.com', 'sae.niijimasisters.com'];

describe('where to go after signing in', () => {
	it('keeps paths on this site and full addresses on our own hosts', () => {
		expect(safeNext('/?x=1', own)).toBe('/?x=1');
		expect(safeNext('https://sae.niijimasisters.com/', own)).toBe(
			'https://sae.niijimasisters.com/'
		);
	});

	it('refuses anything else', () => {
		for (const bad of [
			'//evil.com',
			'/\\evil.com',
			'https://evil.com/',
			'javascript:alert(1)',
			'https://u:p@sae.niijimasisters.com/',
			'/signin',
			'/auth/login',
			null
		]) {
			expect(safeNext(bad, own), String(bad)).toBe('/');
		}
		expect(safeNext('https://sae.niijimasisters.com/auth/login', own)).toBe(
			'https://sae.niijimasisters.com/'
		);
	});
});
