<script lang="ts">
	/**
	 * The Niijima services as tilted cards, the landing page's Network menu in tile form: arcana
	 * numeral, name, and a live dot (checked by the server).
	 */
	import type { ServiceStatus, Tile } from '../types.ts';

	interface Props {
		tiles: readonly Tile[];
	}

	let { tiles }: Props = $props();

	const TILTS = [-2, 1.5, -1, 2, -2.5, 1];
	const WORDS: Record<ServiceStatus, string> = {
		up: 'Online',
		down: 'Down',
		checking: 'Checking',
		unchecked: 'Not checked',
		soon: 'Coming soon'
	};
</script>

<ul class="tiles">
	{#each tiles as tile, i (tile.id)}
		<li class="tile" style="--r:{TILTS[i % TILTS.length]}deg" data-accent={tile.accent}>
			<a class="card" class:is-soon={tile.status === 'soon'} href={tile.url}>
				<span class="arc" aria-hidden="true">{tile.arcana}</span>
				<span class="name">{tile.label}</span>
				<span class="hint">{tile.hint}</span>
				{#if tile.status === 'soon'}
					<span class="soon nj-stamp nj-stamp--soon">Soon</span>
				{:else if tile.status !== 'unchecked'}
					<span class="dot is-{tile.status}" title={WORDS[tile.status]}
						><span class="nj-sr">{WORDS[tile.status]}</span></span
					>
				{/if}
			</a>
		</li>
	{/each}
</ul>

<style>
	.tiles {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 22px 16px;
		margin: 0;
		padding: 4px 6px 8px 0;
		list-style: none;
	}
	@media (min-width: 640px) {
		.tiles {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (min-width: 1000px) {
		.tiles {
			grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		}
	}
	.tile {
		--shadow: var(--nj-accent);
		transform: rotate(var(--r, 0deg));
	}
	.tile[data-accent='makoto'] {
		--shadow: var(--nj-makoto-cyan);
	}
	.tile[data-accent='sae'] {
		--shadow: var(--nj-sae-gold);
	}
	.card {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		align-content: center;
		row-gap: 2px;
		min-height: 92px;
		padding: 10px 24px 10px 14px;
		background: var(--nj-paper);
		color: var(--nj-ink);
		text-decoration: none;
		clip-path: polygon(0 3%, 100% 0, 98% 100%, 1% 97%);
		transition:
			transform var(--nj-fast) var(--nj-snap),
			background-color 0.06s,
			color 0.06s;
	}
	/* clip-path would cut the shadow off: draw it as a second layer instead. */
	.tile {
		position: relative;
		isolation: isolate;
	}
	.tile::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: var(--shadow);
		transform: translate(6px, 6px);
		clip-path: polygon(0 3%, 100% 0, 98% 100%, 1% 97%);
		transition: transform var(--nj-fast) var(--nj-snap);
	}
	.card:hover,
	.card:focus-visible {
		background: var(--nj-ink);
		color: var(--nj-paper);
		transform: scale(1.05) rotate(-1deg);
	}
	.card:focus-visible {
		outline-offset: 2px;
	}
	.tile:has(.card:hover)::before,
	.tile:has(.card:focus-visible)::before {
		transform: translate(9px, 9px) scale(1.05);
	}
	.arc {
		color: var(--nj-accent);
		font: 400 20px/1 var(--nj-font-display);
		letter-spacing: 0.04em;
	}
	.tile[data-accent='makoto'] .arc {
		color: var(--nj-makoto);
	}
	.tile[data-accent='sae'] .arc {
		color: var(--nj-sae-crimson);
	}
	.card:hover .arc,
	.card:focus-visible .arc {
		color: var(--shadow);
	}
	.name {
		overflow: hidden;
		font: 400 24px/1.05 var(--nj-font-display);
		letter-spacing: 0.02em;
		text-overflow: ellipsis;
		text-transform: uppercase;
		white-space: nowrap;
	}
	.hint {
		overflow: hidden;
		color: var(--nj-locked);
		font: 700 11px/1.4 var(--nj-font-body);
		letter-spacing: 0.12em;
		text-overflow: ellipsis;
		text-transform: uppercase;
		white-space: nowrap;
	}
	.card:hover .hint,
	.card:focus-visible .hint {
		color: var(--nj-paper-muted);
	}
	.dot {
		position: absolute;
		top: 10px;
		right: 10px;
		width: 12px;
		height: 12px;
		border: 2px solid var(--nj-ink);
		border-radius: 50%;
	}
	.card:hover .dot,
	.card:focus-visible .dot {
		border-color: var(--nj-paper);
	}
	.dot.is-up {
		background: var(--nj-hi);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--nj-hi) 35%, transparent);
	}
	.dot.is-down {
		border-radius: 0;
		border: 0;
		width: 14px;
		height: 14px;
		background: var(--nj-accent);
		clip-path: polygon(
			20% 0,
			50% 30%,
			80% 0,
			100% 20%,
			70% 50%,
			100% 80%,
			80% 100%,
			50% 70%,
			20% 100%,
			0 80%,
			30% 50%,
			0 20%
		);
	}
	.dot.is-checking {
		border-style: dashed;
		border-color: var(--nj-locked);
	}
	.soon {
		position: absolute;
		top: -12px;
		right: 4px;
		padding: 3px 6px 2px;
		font-size: 12px;
	}
	.is-soon {
		background: var(--nj-ink-raised);
		color: var(--nj-paper-muted);
	}
	@media (prefers-reduced-motion: no-preference) {
		.dot.is-up {
			animation: pulse 2.4s ease-in-out infinite;
		}
	}
	@keyframes pulse {
		50% {
			box-shadow: 0 0 0 6px color-mix(in srgb, var(--nj-hi) 0%, transparent);
		}
	}
</style>
