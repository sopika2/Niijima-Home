import { describe, expect, it } from 'vitest';
import { discordAccess } from './access.ts';
import {
	cookieDomainFor,
	createSession,
	readSession,
	SESSION_COOKIE,
	sessionCookieOptions
} from './session.ts';

const secret = 'test-secret-0123456789abcdef-0123456789';
const user = { id: '1234567890123456789', name: 'Makoto' };

describe('sign-in cookie', () => {
	it('reads back a cookie it signed and rejects tampered, foreign or expired ones', () => {
		const value = createSession(user, secret);
		expect(readSession(value, secret)).toEqual({ ...user, renew: false });
		const [body, signature] = value.split('.');
		const forged = Buffer.from(
			JSON.stringify({ ...user, id: '999999999999999999', exp: 9e9 })
		).toString('base64url');
		expect(readSession(`${forged}.${signature}`, secret)).toBeNull();
		expect(readSession(`${body}.x${signature}`, secret)).toBeNull();
		expect(readSession(value, 'another-secret')).toBeNull();
		expect(readSession(value, secret, Date.now() + 396 * 86_400_000)).toBeNull();
		expect(readSession(undefined, secret)).toBeNull();
	});

	it('is named nj_session and shared across the domain when SESSION_DOMAIN fits the host', () => {
		expect(SESSION_COOKIE).toBe('nj_session');
		expect(cookieDomainFor('home.niijimasisters.com', 'niijimasisters.com')).toBe(
			'niijimasisters.com'
		);
		expect(cookieDomainFor('sae.niijimasisters.com', '.NiijimaSisters.com')).toBe(
			'niijimasisters.com'
		);
		expect(cookieDomainFor('localhost', 'niijimasisters.com')).toBeUndefined();
		expect(cookieDomainFor('evilniijimasisters.com', 'niijimasisters.com')).toBeUndefined();
		expect(cookieDomainFor('home.niijimasisters.com', undefined)).toBeUndefined();
		const options = sessionCookieOptions('home.niijimasisters.com', true, 'niijimasisters.com');
		expect(options).toMatchObject({
			path: '/',
			httpOnly: true,
			secure: true,
			domain: 'niijimasisters.com'
		});
		expect(options.maxAge).toBeGreaterThan(390 * 86_400);
	});

	it('only lets in Discord accounts listed in config.yml', () => {
		const gate = discordAccess({
			app: { clientId: 'c', clientSecret: 's', redirectUri: 'https://x/auth/callback' },
			sessionSecret: secret,
			allowedIds: [user.id]
		});
		const cookies = (value: string) => ({
			get: (name: string) => (name === SESSION_COOKIE ? value : undefined)
		});
		expect(gate.verify(cookies(createSession(user, secret)))).toMatchObject(user);
		expect(
			gate.verify(cookies(createSession({ id: '111111111111111111', name: 'x' }, secret)))
		).toBeNull();
	});
});
