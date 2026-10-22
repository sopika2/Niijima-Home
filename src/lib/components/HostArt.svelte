<script lang="ts">
	/**
	 * The host's art from ./assets, in a slashed frame. Without a file, a placeholder silhouette
	 * stands in (never a broken image); its tooltip says where the picture goes.
	 */
	interface Props {
		src: string | null;
		name: string;
	}

	let { src, name }: Props = $props();
</script>

<figure
	class="frame"
	class:is-empty={!src}
	title={src ? undefined : `Put ${name}'s art in ./assets (see config.yml → host)`}
>
	{#if src}
		<img {src} alt={name} width="230" height="220" decoding="async" />
	{:else}
		<svg viewBox="0 0 100 96" aria-hidden="true">
			<path
				class="body"
				d="M50 12c-11 0-19 9-19 21 0 8 3 14 8 18-12 4-21 13-24 27l-2 18h74l-2-18c-3-14-12-23-24-27 5-4 8-10 8-18 0-12-8-21-19-21z"
			/>
		</svg>
		<span class="nj-sr">{name}</span>
	{/if}
</figure>

<style>
	.frame {
		position: relative;
		width: 100%;
		height: 100%;
		margin: 0;
		filter: drop-shadow(8px 8px 0 var(--nj-accent)) drop-shadow(-5px 5px 0 var(--nj-hi));
	}
	img,
	svg {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 50% 20%;
		clip-path: polygon(6% 0, 100% 4%, 94% 100%, 0 94%);
		background: var(--nj-field);
	}
	svg {
		background:
			radial-gradient(var(--nj-dot-light) 30%, transparent 34%) 0 0 / 11px 11px,
			var(--nj-field-deep);
	}
	.body {
		fill: var(--nj-ink);
		stroke: var(--nj-hi);
		stroke-width: 1.2;
	}
</style>
