<script lang="ts">
	/**
	 * The top of the page: the in-game calendar with the weather, the host greeting you in a
	 * speech box, her art, and the persona switch (not on makoto.… or sae.…, where it's fixed).
	 */
	import type { Persona } from '@niijima/design';
	import { Bands, DateHud, PersonaSwitch, Speech } from '@niijima/design/svelte';
	import type { Greeting } from '../types.ts';
	import HostArt from './HostArt.svelte';

	interface Props {
		greeting: Greeting;
		weather: string | null;
		timezone: string;
		persona: Persona;
		fixed: boolean;
		onswitch: (persona: Persona) => void;
	}

	let { greeting, weather, timezone, persona, fixed, onswitch }: Props = $props();
</script>

<header class="hero">
	<Bands ghost="Home" />
	<div class="hud">
		<DateHud timeZone={timezone} {weather} size="var(--hud-size)" />
	</div>
	<div class="who">
		{#if fixed}
			<span class="nj-plate nj-plate--hi">{persona === 'sae' ? "Sae's" : "Makoto's"} page</span>
		{:else}
			<PersonaSwitch value={persona} onchange={onswitch} />
		{/if}
	</div>
	<div class="greeting">
		<Speech tag={{ number: greeting.arcana, word: greeting.name }}>
			<p class="line">{greeting.line}</p>
		</Speech>
	</div>
	<div class="art">
		<HostArt src={greeting.art} name={greeting.name} />
	</div>
</header>

<style>
	.hero {
		--hud-size: 46px;
		position: relative;
		isolation: isolate;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas:
			'hud who'
			'greeting greeting';
		align-items: start;
		gap: 26px 12px;
		padding: 34px 16px 22px 30px;
		overflow: hidden;
	}
	.hero :global(.nj-bands__band) {
		--band-top: 30%;
		--band-h: 34%;
		--band-rot: -9deg;
	}
	.hero :global(.nj-bands__ghost) {
		bottom: -8%;
		font-size: clamp(90px, 16vw, 220px);
	}
	.hud {
		grid-area: hud;
		/* The starburst reaches up and left of the date; leave it room. */
		min-height: calc(var(--hud-size) * 1.9);
	}
	.who {
		grid-area: who;
		display: flex;
		justify-content: flex-end;
		padding-top: 2px;
	}
	.who :global(.nj-persona__opt) {
		min-height: 44px;
		padding: 10px 14px 8px;
		font-size: 18px;
	}
	.greeting {
		grid-area: greeting;
		min-width: 0;
		padding: 10px 6px 4px 0;
	}
	.greeting :global(.nj-speech__card) {
		padding: 30px 26px 16px 22px;
	}
	.greeting :global(.nj-speech::before) {
		right: 10%;
	}
	.line {
		margin: 4px 0 0;
		font: 700 18px/1.35 var(--nj-font-body);
	}
	.art {
		display: none;
	}

	@media (min-width: 760px) {
		.hero {
			--hud-size: 64px;
			grid-template-columns: 260px minmax(0, 1fr) 230px;
			grid-template-areas:
				'hud greeting art'
				'. greeting art';
			gap: 0 28px;
			padding: 44px max(24px, calc((100vw - 1240px) / 2)) 24px;
			min-height: 260px;
		}
		.who {
			position: absolute;
			z-index: 3;
			top: 16px;
			right: max(20px, calc((100vw - 1240px) / 2));
		}
		.greeting {
			align-self: end;
			max-width: 620px;
			padding: 70px 0 6px;
		}
		.line {
			font-size: 21px;
		}
		.art {
			grid-area: art;
			display: block;
			align-self: end;
			margin-top: 30px;
			height: 220px;
		}
	}
</style>
