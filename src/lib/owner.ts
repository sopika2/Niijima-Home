import type { Persona } from '@niijima/design';
import type { Owner } from './types.ts';

/** Whose label to show on an item: nothing for your own, the owner's name otherwise. */
export function ownerTag(owner: Owner, persona: Persona): string | null {
	if (owner === persona) return null;
	return owner === 'shared' ? 'Shared' : owner === 'makoto' ? 'Makoto' : 'Sae';
}
