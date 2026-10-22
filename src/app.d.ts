declare global {
	namespace App {
		interface Locals {
			/** Who is signed in with Discord (null when ACCESS_MODE=off). */
			user: { id: string; name: string } | null;
			/** Whose start page this is: from the host on makoto.… and sae.…, else the nj_persona cookie. */
			persona: import('@niijima/design').Persona;
			/** True on a sister's own host, where the persona can't be switched. */
			personaFixed: boolean;
		}
	}
}

export {};
