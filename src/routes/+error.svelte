<script lang="ts">
	/** Every error as the landing page's Palace. */
	import { page } from '$app/state';
	import { Palace } from '@niijima/design/svelte';

	const missing = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{page.status} · Niijima Home</title>
</svelte:head>

{#if missing}
	<Palace
		code="404"
		target={page.url.pathname}
		back={{ label: 'Back to the start page', href: '/' }}
	/>
{:else}
	<Palace
		code={String(page.status)}
		title="Something went wrong"
		target={page.url.pathname}
		text={page.status === 401
			? 'You were signed out. Sign in again to see your start page.'
			: 'The start page tripped over something. Try again in a moment.'}
		back={{
			label: page.status === 401 ? 'Sign in' : 'Back to the start page',
			href: page.status === 401 ? '/signin' : '/'
		}}
	/>
{/if}
