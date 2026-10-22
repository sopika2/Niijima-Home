<script lang="ts">
	/** A section's name in cut-out letters, with an optional way into the app behind it. */
	import { Ransom } from '@niijima/design/svelte';

	interface Props {
		text: string;
		href?: string;
		action?: string;
	}

	let { text, href, action = 'Open' }: Props = $props();
</script>

<div class="title">
	<Ransom
		as="h2"
		text={text.toUpperCase()}
		seed={`home-${text}`}
		size="clamp(24px, 3.4vw, 32px)"
		tilt={6}
	/>
	{#if href}<a class="more" {href}>{action}<i aria-hidden="true"></i></a>{/if}
</div>

<style>
	.title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin: 0 0 14px;
	}
	.title :global(.nj-ransom) {
		transform: rotate(var(--nj-tilt-sm));
		transform-origin: 0 100%;
	}
	.more {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 4px;
		color: var(--nj-hi);
		font: 700 13px/1 var(--nj-font-body);
		letter-spacing: 0.14em;
		text-decoration: none;
		text-transform: uppercase;
	}
	.more i {
		width: 8px;
		height: 10px;
		background: currentColor;
		clip-path: polygon(0 0, 100% 50%, 0 100%, 22% 50%);
		transition: transform var(--nj-fast) var(--nj-snap);
	}
	.more:hover i,
	.more:focus-visible i {
		transform: translateX(4px);
	}
</style>
