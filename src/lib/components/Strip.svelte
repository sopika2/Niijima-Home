<script lang="ts">
	/**
	 * Calendar, Treasure and the Compendium at a glance: one small panel near the top. Three
	 * cells side by side on a computer; on a phone three cards you swipe through, so the strip
	 * stays short. Each slot stands alone: one that isn't set up or isn't answering says so in
	 * a single muted line.
	 */
	import { moneyText as text, toggleMoney } from '../money.ts';
	import type { Panel, StripSlot, StripView } from '../types.ts';

	interface Props {
		strip: StripView;
	}

	let { strip }: Props = $props();

	const NAMES: Record<StripSlot, string> = {
		calendar: 'Calendar',
		treasure: 'Treasure',
		compendium: 'Compendium'
	};
	const PLATES: Record<StripSlot, string> = {
		calendar: 'nj-plate--red',
		treasure: 'nj-plate--hi',
		compendium: 'nj-plate--paper'
	};

	/** "Fri 24 Oct" → "Fri 24": the month is clear enough within a week. */
	const shortDay = (label: string) => label.split(' ').slice(0, 2).join(' ');

	/** "Treasure refused the token: …" → "Refused the token: …": the card already says whose. */
	const short = (hint: string) =>
		hint.replace(/^(?:Calendar|Treasure|Compendium) (\S)/, (_, first: string) =>
			first.toUpperCase()
		);

	const budgetsLine = (over: number, near: number) =>
		[over > 0 ? `${over} over` : '', near > 0 ? `${near} near` : ''].filter(Boolean).join(' · ');
</script>

{#snippet quiet(panel: Panel<unknown>)}
	{#if panel.state !== 'ok'}
		<p class="quiet" title={panel.hint}>
			<b>{panel.state === 'off' ? 'Not set up' : 'Unavailable'}</b>
			<span>{short(panel.hint)}</span>
		</p>
	{/if}
{/snippet}

{#snippet head(slot: StripSlot)}
	<a class="name" href={strip.links[slot]}>
		<span class="nj-plate {PLATES[slot]}">{NAMES[slot]}</span><i aria-hidden="true"></i>
	</a>
{/snippet}

<section class="strip" aria-label="At a glance">
	<div class="track" class:solo={strip.slots.length === 1}>
		{#each strip.slots as slot (slot)}
			<article class="card" aria-label={NAMES[slot]}>
				{#if slot === 'calendar' && strip.calendar}
					<div class="top">{@render head(slot)}</div>
					{#if strip.calendar.state === 'ok'}
						{#if strip.calendar.value.length === 0}
							<a class="free" href={strip.links.calendar}>Nothing planned</a>
						{:else}
							<ul class="rows">
								{#each strip.calendar.value as event, i (i)}
									{@const first = i === 0 || strip.calendar.value[i - 1]?.day !== event.day}
									<li>
										<a class="event" href={event.href}>
											<span class="day" class:is-today={event.day === 'Today'}
												>{first ? shortDay(event.day) : ''}</span
											>
											<span class="time" class:all-day={event.time === null}
												>{event.time ?? 'All day'}</span
											>
											<i class="dot" data-owner={event.owner} title={event.owner}></i>
											<span class="title">{event.title}</span>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					{:else}
						{@render quiet(strip.calendar)}
					{/if}
				{:else if slot === 'treasure' && strip.treasure}
					<div class="top">
						{@render head(slot)}
						{#if strip.treasure.state === 'ok'}
							<button
								type="button"
								class="peek"
								onclick={toggleMoney}
								aria-label="Show or hide amounts"
							>
								<span class="nj-money">Hide</span><span class="nj-money-mask">Show</span>
							</button>
						{/if}
					</div>
					{#if strip.treasure.state === 'ok'}
						{@const view = strip.treasure.value}
						<a class="money" href={strip.links.treasure}>
							<span class="total" aria-label="Total">
								<span class="nj-money"
									>{#if view.total.negative}−{/if}{#if view.total.symbolFirst}<small
											>{view.total.symbol}</small
										>{/if}{view.total.amount}{#if !view.total.symbolFirst}<small
											>{view.total.symbol}</small
										>{/if}</span
								><span class="nj-money-mask" aria-label="Hidden">✱✱✱✱✱✱</span>
							</span>
							{#if view.endOfMonth}
								<span class="line"
									><span>Month end</span><b
										><span class="nj-money">{text(view.endOfMonth)}</span><span
											class="nj-money-mask">✱✱✱✱</span
										></b
									></span
								>
							{/if}
							<span class="line">
								<span>Budgets</span>
								{#if view.over + view.near > 0}
									<b class="flag" class:is-over={view.over > 0}
										>{budgetsLine(view.over, view.near)}</b
									>
								{:else}
									<b class="ok">on track</b>
								{/if}
							</span>
							{#if view.nextBill}
								<span class="line bill"
									><span class="due"
										><span class="when">{view.nextBill.when}</span> {view.nextBill.name}</span
									><b
										><span class="nj-money">{text(view.nextBill.amount)}</span><span
											class="nj-money-mask">✱✱✱</span
										></b
									></span
								>
							{/if}
						</a>
					{:else}
						{@render quiet(strip.treasure)}
					{/if}
				{:else if slot === 'compendium' && strip.compendium}
					<div class="top">
						{@render head(slot)}
						<form class="find" action={strip.compendiumSearch} method="get" role="search">
							<input
								type="search"
								name="query"
								placeholder="Search the wiki"
								aria-label="Search the Compendium"
								autocomplete="off"
								enterkeyhint="search"
								required
							/>
							<button type="submit" aria-label="Search"><i aria-hidden="true"></i></button>
						</form>
					</div>
					{#if strip.compendium.state === 'ok'}
						{#if strip.compendium.value.length === 0}
							<a class="free" href={strip.links.compendium}>No pages yet</a>
						{:else}
							<ul class="rows docs">
								{#each strip.compendium.value as doc, i (i)}
									<li>
										<a class="doc" href={doc.href}>
											<span class="title">{doc.title}</span>
											<span class="meta"
												>{[doc.ago, doc.collection].filter(Boolean).join(' · ')}</span
											>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					{:else}
						{@render quiet(strip.compendium)}
					{/if}
				{/if}
			</article>
		{/each}
	</div>
</section>

<style>
	/* A phone: one card and a slice of the next, swiped sideways, snapping into place. */
	.track {
		display: flex;
		gap: 12px;
		margin: 0 -16px;
		padding: 2px 16px 6px;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scroll-snap-type: x mandatory;
		scroll-padding-inline: 16px;
		scrollbar-width: none;
	}
	.track::-webkit-scrollbar {
		display: none;
	}
	.card {
		flex: 0 0 86%;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 8px 12px 10px;
		background: var(--nj-surface);
		border-left: 5px solid var(--nj-accent);
		clip-path: polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%);
		scroll-snap-align: start;
	}
	.track.solo .card {
		flex-basis: 100%;
	}

	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		min-height: 44px;
	}
	.name {
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		color: var(--nj-hi);
		text-decoration: none;
	}
	.name i {
		width: 7px;
		height: 9px;
		background: currentColor;
		clip-path: polygon(0 0, 100% 50%, 0 100%, 22% 50%);
		transition: transform var(--nj-fast) var(--nj-snap);
	}
	.name:hover i,
	.name:focus-visible i {
		transform: translateX(3px);
	}

	.rows {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.rows li + li {
		border-top: 1px solid color-mix(in srgb, var(--nj-paper) 10%, transparent);
	}
	.event,
	.doc {
		display: grid;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		color: var(--nj-text);
		text-decoration: none;
	}
	.event {
		grid-template-columns: 4.1em 3.1em 8px minmax(0, 1fr);
	}
	.event:hover .title,
	.doc:hover .title,
	.event:focus-visible .title,
	.doc:focus-visible .title {
		color: var(--nj-hi);
	}
	.day {
		color: var(--nj-text-muted);
		font: 800 11px/1.1 var(--nj-font-body);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		white-space: nowrap;
		overflow: hidden;
	}
	.day.is-today {
		color: var(--nj-hi);
	}
	.time {
		color: var(--nj-paper);
		font: 400 18px/1 var(--nj-font-display);
		letter-spacing: 0.02em;
	}
	.time.all-day {
		color: var(--nj-text-muted);
		font: 800 10px/1.1 var(--nj-font-body);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	/* Each sister's colour, as in Calendar: Makoto's cyan, Sae's gold, thief red for both. */
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--nj-red-text);
	}
	.dot[data-owner='makoto'] {
		background: var(--nj-makoto-cyan);
	}
	.dot[data-owner='sae'] {
		background: var(--nj-sae-gold);
	}
	.title {
		min-width: 0;
		overflow: hidden;
		font: 700 15px/1.25 var(--nj-font-body);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.doc {
		grid-template-columns: minmax(0, 1fr) auto;
	}
	.meta {
		max-width: 11em;
		overflow: hidden;
		color: var(--nj-text-muted);
		font: 600 12px/1.2 var(--nj-font-body);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* A phone shows the three newest; a computer has room for more. */
	.docs li:nth-child(n + 4) {
		display: none;
	}

	.free,
	.quiet {
		display: flex;
		align-items: center;
		min-height: 44px;
		color: var(--nj-text-muted);
		font: 600 14px/1.3 var(--nj-font-body);
		text-decoration: none;
	}
	.quiet {
		gap: 8px;
		margin: 0;
	}
	.quiet b {
		flex: none;
		color: var(--nj-locked);
		font: 800 11px/1 var(--nj-font-body);
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.quiet span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.peek {
		min-width: 64px;
		min-height: 44px;
		padding: 0 10px;
		border: 2px solid var(--nj-paper-muted);
		background: var(--nj-ink);
		color: var(--nj-paper);
		font: 800 12px/1 var(--nj-font-body);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		cursor: pointer;
		transform: rotate(var(--nj-tilt-xs));
	}
	.peek:hover,
	.peek:focus-visible {
		border-color: var(--nj-hi);
		color: var(--nj-hi);
	}
	.money {
		display: grid;
		gap: 4px;
		color: var(--nj-text);
		text-decoration: none;
	}
	.total {
		margin: 0 0 4px;
		color: var(--nj-paper);
		font: 400 clamp(34px, 9.5vw, 44px) / 1.05 var(--nj-font-display);
		letter-spacing: 0.01em;
		white-space: nowrap;
		text-shadow:
			2px 2px 0 var(--nj-ink),
			4px 4px 0 var(--nj-accent);
		transform: rotate(var(--nj-tilt-sm)) skewX(-6deg);
		transform-origin: 0 100%;
	}
	.total small {
		margin: 0 0.12em;
		color: var(--nj-hi);
		font-size: 0.5em;
	}
	.line {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		color: var(--nj-text-muted);
		font: 600 14px/1.3 var(--nj-font-body);
	}
	.line b {
		color: var(--nj-text);
		font: 400 17px/1.15 var(--nj-font-display);
		letter-spacing: 0.02em;
		white-space: nowrap;
	}
	.due {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.when {
		color: var(--nj-hi);
		font-weight: 700;
	}
	.line b.flag {
		color: var(--nj-hi-2);
		font: 800 13px/1.3 var(--nj-font-body);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.line b.flag.is-over {
		color: var(--nj-red-text);
	}
	.line b.ok {
		color: var(--nj-text-muted);
		font: 700 13px/1.3 var(--nj-font-body);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.find {
		display: flex;
		flex: 1 1 auto;
		max-width: 15em;
		min-width: 0;
		height: 40px;
		border: 2px solid var(--nj-paper-muted);
		background: var(--nj-ink);
	}
	.find:focus-within {
		border-color: var(--nj-hi);
	}
	.find input {
		flex: 1;
		min-width: 0;
		padding: 0 8px;
		border: 0;
		background: transparent;
		color: var(--nj-paper);
		font: 600 15px/1 var(--nj-font-body);
		outline: none;
	}
	.find input::placeholder {
		color: var(--nj-text-muted);
	}
	.find button {
		flex: none;
		width: 40px;
		border: 0;
		background: var(--nj-accent);
		cursor: pointer;
	}
	.find button i {
		display: block;
		width: 10px;
		height: 12px;
		margin: auto;
		background: var(--nj-paper);
		clip-path: polygon(0 0, 100% 50%, 0 100%, 22% 50%);
	}

	@media (min-width: 760px) {
		.track {
			display: grid;
			grid-auto-columns: minmax(0, 1fr);
			grid-auto-flow: column;
			gap: 16px;
			margin: 0;
			padding: 0;
			overflow: visible;
		}
		.docs li:nth-child(n + 4) {
			display: block;
		}
	}
	@media (pointer: fine) {
		.event,
		.doc {
			min-height: 34px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.name i {
			transition: none;
		}
	}
</style>
