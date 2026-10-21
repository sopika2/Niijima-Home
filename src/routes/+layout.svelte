<script lang="ts">
	import '@niijima/design/niijima.css';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	// The browser bar in her colours (Firefox for Android and installed apps use it).
	const theme = $derived(data.persona === 'sae' ? '#6e0014' : '#12151f');
</script>

<svelte:head>
	<title>{data.title}</title>
	<meta name="theme-color" content={theme} />
</svelte:head>

{@render children()}
