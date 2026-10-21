/**
 * Where to go after signing in. A path on this site, or a full address on one of this app's own
 * hosts (sign-in always happens on PUBLIC_URL, then sends you back to makoto.… or sae.…). Anything
 * else becomes "/", so a crafted link can't send you to another website after you sign in.
 */
export function safeNext(
	value: string | null | undefined,
	ownHosts: Iterable<string> = []
): string {
	if (!value) return '/';
	if (value.startsWith('/')) {
		if (value.startsWith('//') || value.startsWith('/\\')) return '/';
		if (value.startsWith('/signin') || value.startsWith('/auth/')) return '/';
		return value;
	}
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return '/';
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return '/';
	if (url.username || url.password) return '/';
	if (!new Set([...ownHosts].map((host) => host.toLowerCase())).has(url.host.toLowerCase())) {
		return '/';
	}
	if (url.pathname.startsWith('/signin') || url.pathname.startsWith('/auth/')) {
		return `${url.origin}/`;
	}
	return url.href;
}
