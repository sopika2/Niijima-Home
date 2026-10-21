import { personaFromCookie, type Persona } from '@niijima/design';

/** config.yml → hosts: which host names belong to one sister. */
export type HostMap = Readonly<Record<string, Persona>>;

/** "Makoto.NiijimaSisters.com:443" → "makoto.niijimasisters.com"; "[::1]:5182" → "[::1]". */
export function hostName(host: string | null | undefined): string {
	const value = (host ?? '').trim().toLowerCase();
	if (value.startsWith('[')) return value.slice(0, value.indexOf(']') + 1);
	return value.replace(/:\d*$/, '').replace(/\.$/, '');
}

/** The persona a host forces (makoto.… and sae.…), or null where the visitor chooses. */
export function hostPersona(host: string | null | undefined, hosts: HostMap): Persona | null {
	const name = hostName(host);
	return name && Object.hasOwn(hosts, name) ? (hosts[name] ?? null) : null;
}

export interface ResolvedPersona {
	readonly persona: Persona;
	/** True on a sister's own host: the switch is hidden and the cookie is ignored. */
	readonly fixed: boolean;
}

/**
 * Whose start page this is: the host decides on makoto.… and sae.…; anywhere else (home.…,
 * localhost) the nj_persona cookie every Niijima site shares does, and Makoto without one.
 */
export function resolvePersona(
	host: string | null | undefined,
	cookieHeader: string | null | undefined,
	hosts: HostMap
): ResolvedPersona {
	const forced = hostPersona(host, hosts);
	if (forced) return { persona: forced, fixed: true };
	return { persona: personaFromCookie(cookieHeader) ?? 'makoto', fixed: false };
}
