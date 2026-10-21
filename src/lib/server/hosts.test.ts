import { describe, expect, it } from 'vitest';
import { hostName, hostPersona, resolvePersona } from './hosts.ts';

const hosts = { 'makoto.niijimasisters.com': 'makoto', 'sae.niijimasisters.com': 'sae' } as const;

describe('host → persona', () => {
	it("forces the sister's persona on her own host, whatever the cookie says", () => {
		expect(resolvePersona('sae.niijimasisters.com', 'nj_persona=makoto', hosts)).toEqual({
			persona: 'sae',
			fixed: true
		});
		expect(resolvePersona('makoto.niijimasisters.com', 'nj_persona=sae', hosts)).toEqual({
			persona: 'makoto',
			fixed: true
		});
	});

	it('follows the shared cookie anywhere else, Makoto by default', () => {
		expect(resolvePersona('home.niijimasisters.com', 'a=1; nj_persona=sae', hosts)).toEqual({
			persona: 'sae',
			fixed: false
		});
		expect(resolvePersona('home.niijimasisters.com', null, hosts)).toEqual({
			persona: 'makoto',
			fixed: false
		});
		expect(resolvePersona('localhost:5182', 'nj_persona=akechi', hosts).persona).toBe('makoto');
	});

	it('ignores case, ports and a trailing dot', () => {
		expect(hostPersona('SAE.NiijimaSisters.com:443', hosts)).toBe('sae');
		expect(hostPersona('makoto.niijimasisters.com.', hosts)).toBe('makoto');
		expect(hostName('[::1]:5182')).toBe('[::1]');
		expect(hostPersona('evil-sae.niijimasisters.com', hosts)).toBeNull();
		expect(hostPersona('constructor', hosts)).toBeNull();
		expect(hostPersona(undefined, hosts)).toBeNull();
	});
});
