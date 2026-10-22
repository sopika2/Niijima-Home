import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Who is signed in. Kept in a signed cookie, so no session table is needed. The payload and
 * signature are the same as Treasure's; with the same SESSION_SECRET and SESSION_DOMAIN in every
 * Niijima app, one sign-in covers them all.
 */
export interface SessionUser {
	readonly id: string;
	readonly name: string;
}

interface Payload extends SessionUser {
	/** Expiry, in seconds since 1970. */
	readonly exp: number;
}

export const SESSION_COOKIE = 'nj_session';
/** About as long as browsers allow a cookie to live (400 days). Renewed on use, so it never runs out while you use the page. */
export const SESSION_DAYS = 395;
/** Renew the cookie once it is a day old. */
const RENEW_AFTER_SECONDS = 86_400;

const encode = (text: string) => Buffer.from(text).toString('base64url');
const decode = (text: string) => Buffer.from(text, 'base64url').toString('utf8');

function sign(body: string, secret: string): string {
	return createHmac('sha256', secret).update(body).digest('base64url');
}

/** A cookie value proving `user` signed in, valid for SESSION_DAYS. */
export function createSession(user: SessionUser, secret: string, now = Date.now()): string {
	const payload: Payload = { ...user, exp: Math.floor(now / 1000) + SESSION_DAYS * 86_400 };
	const body = encode(JSON.stringify(payload));
	return `${body}.${sign(body, secret)}`;
}

export interface ReadSession extends SessionUser {
	/** True when the cookie is old enough to be reissued with a fresh expiry. */
	readonly renew: boolean;
}

/** The user in a cookie value, or null when it is missing, tampered with or expired. */
export function readSession(
	value: string | undefined,
	secret: string,
	now = Date.now()
): ReadSession | null {
	if (!value) return null;
	const [body, signature] = value.split('.');
	if (!body || !signature) return null;
	const expected = Buffer.from(sign(body, secret));
	const given = Buffer.from(signature);
	if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
	try {
		const payload = JSON.parse(decode(body)) as Payload;
		if (typeof payload.id !== 'string' || payload.exp * 1000 < now) return null;
		const issued = payload.exp - SESSION_DAYS * 86_400;
		return {
			id: payload.id,
			name: String(payload.name ?? ''),
			renew: now / 1000 - issued > RENEW_AFTER_SECONDS
		};
	} catch {
		return null;
	}
}

/** A random value for the OAuth `state` check. */
export function randomState(): string {
	return randomBytes(24).toString('base64url');
}

/**
 * The cookie's Domain: SESSION_DOMAIN when this host is inside it (so every subdomain shares the
 * sign-in), otherwise host-only (localhost, or a domain that doesn't match).
 */
export function cookieDomainFor(
	hostname: string,
	sessionDomain: string | undefined
): string | undefined {
	const domain = sessionDomain?.trim().replace(/^\./, '').toLowerCase();
	if (!domain) return undefined;
	const host = hostname.toLowerCase();
	return host === domain || host.endsWith(`.${domain}`) ? domain : undefined;
}

export interface CookieOptions {
	readonly path: string;
	readonly httpOnly: boolean;
	readonly sameSite: 'lax';
	readonly secure: boolean;
	readonly maxAge: number;
	readonly domain?: string;
}

/** How the session cookie is set (and deleted: the same path and domain). */
export function sessionCookieOptions(
	hostname: string,
	secure: boolean,
	sessionDomain: string | undefined
): CookieOptions {
	const domain = cookieDomainFor(hostname, sessionDomain);
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: SESSION_DAYS * 86_400,
		...(domain ? { domain } : {})
	};
}
