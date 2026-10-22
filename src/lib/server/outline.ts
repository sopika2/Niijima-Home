import { z } from 'zod';
import { fetchJson } from './upstream.ts';

/**
 * The Compendium is an Outline wiki. Its API is POST-only JSON with a bearer API key
 * (https://www.getoutline.com/developers): `documents.list` for the latest pages and
 * `collections.list` for the names of the collections they live in. Read-only; the key never
 * leaves the server.
 */

export interface OutlineDocument {
	readonly id: string;
	readonly title: string;
	/** The document's path in the wiki, e.g. "/doc/tea-notes-Xk2b9QnLtZ". */
	readonly url: string;
	readonly updatedAt: string;
	readonly collectionId: string | null;
}

export interface RecentDocuments {
	readonly documents: readonly OutlineDocument[];
	/** Collection names by id; empty when the key may not list collections. */
	readonly collections: Readonly<Record<string, string>>;
}

const documentsSchema = z.object({
	data: z.array(
		z.object({
			id: z.string(),
			title: z.string().catch(''),
			url: z.string(),
			updatedAt: z.string(),
			collectionId: z.string().nullish()
		})
	)
});

const collectionsSchema = z.object({
	data: z.array(z.object({ id: z.string(), name: z.string() }))
});

/** The `limit` most recently updated documents, newest first, with their collections' names. */
export async function recentDocuments(
	baseUrl: string,
	token: string,
	limit: number,
	signal: AbortSignal
): Promise<RecentDocuments> {
	const api = (method: string) => `${baseUrl.replace(/\/+$/, '')}/api/${method}`;
	const [documents, collections] = await Promise.all([
		fetchJson(api('documents.list'), {
			signal,
			token,
			body: { sort: 'updatedAt', direction: 'DESC', limit }
		}).then((answer) => documentsSchema.parse(answer).data),
		// The names are a nicety: a key scoped to documents only still shows the list.
		fetchJson(api('collections.list'), { signal, token, body: { limit: 100 } }).then(
			(answer) => collectionsSchema.parse(answer).data,
			(error: unknown) => {
				if (signal.aborted) throw error;
				return [];
			}
		)
	]);
	return {
		documents: documents.map((doc) => ({ ...doc, collectionId: doc.collectionId ?? null })),
		collections: Object.fromEntries(
			collections.map((collection) => [collection.id, collection.name])
		)
	};
}
