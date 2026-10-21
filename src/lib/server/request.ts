import type { RequestEvent } from '@sveltejs/kit';

/**
 * Whether the browser is on https. Behind Cloudflare and Traefik the app itself sees plain http,
 * so the forwarded headers count too. (Only used to mark cookies Secure.)
 */
export function isHttps(event: Pick<RequestEvent, 'url' | 'request'>): boolean {
	if (event.url.protocol === 'https:') return true;
	const forwarded = event.request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
	if (forwarded === 'https') return true;
	return /"scheme"\s*:\s*"https"/.test(event.request.headers.get('cf-visitor') ?? '');
}

/** True for phones and tablets, where focusing the search box would pop the keyboard up. */
export function isHandheld(userAgent: string | null): boolean {
	return /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent ?? '');
}
