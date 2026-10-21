<script lang="ts">
	/** The next few events from Niijima Calendar, day by day. */
	import type { Persona } from '@niijima/design';
	import { ownerTag } from '../owner.ts';
	import type { AgendaDay } from '../types.ts';

	interface Props {
		days: readonly AgendaDay[];
		persona: Persona;
		span: number;
	}

	let { days, persona, span }: Props = $props();
</script>

{#if days.length === 0}
	<p class="free">Nothing planned for the next {span} days.</p>
{:else}
	<ol class="days">
		{#each days as day (day.key)}
			<li>
				<h3 class="day" class:is-today={day.label === 'Today'}>{day.label}</h3>
				<ul class="events">
					{#each day.events as event, i (i)}
						{@const tag = ownerTag(event.owner, persona)}
						<li class="event">
							<span class="time" class:all-day={event.time === null}
								>{event.time ?? 'All day'}{#if event.end}<small>–{event.end}</small>{/if}</span
							>
							<span class="what">
								<span class="title">{event.title}</span>
								{#if event.location || tag}
									<span class="meta">
										{#if tag}<span class="tag">{tag}</span>{/if}
										{#if event.location}<span>{event.location}</span>{/if}
									</span>
								{/if}
							</span>
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ol>
{/if}

<style>
	.days,
	.events {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.days {
		display: grid;
		gap: 14px;
	}
	.day {
		display: inline-block;
		margin: 0 0 6px;
		padding: 4px 10px 3px;
		background: var(--nj-ink);
		color: var(--nj-paper);
		font: 400 17px/1.1 var(--nj-font-display);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		transform: rotate(var(--nj-tilt-sm));
	}
	.day.is-today {
		background: var(--nj-accent);
	}
	.event {
		display: grid;
		grid-template-columns: 4.6em minmax(0, 1fr);
		gap: 10px;
		padding: 7px 0;
		border-bottom: 1px solid color-mix(in srgb, var(--nj-paper) 10%, transparent);
	}
	.event:last-child {
		border-bottom: 0;
	}
	.time {
		color: var(--nj-hi);
		font: 400 19px/1.1 var(--nj-font-display);
		letter-spacing: 0.02em;
	}
	.time small {
		display: block;
		color: var(--nj-text-muted);
		font: 600 12px/1.3 var(--nj-font-body);
	}
	.all-day {
		font: 800 12px/1.6 var(--nj-font-body);
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.what {
		display: grid;
		gap: 2px;
		min-width: 0;
	}
	.title {
		font: 700 16px/1.3 var(--nj-font-body);
		overflow-wrap: anywhere;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 8px;
		color: var(--nj-text-muted);
		font: 600 13px/1.3 var(--nj-font-body);
	}
	.tag {
		padding: 1px 5px 0;
		border: 1px dashed var(--nj-hi-2);
		color: var(--nj-hi-2);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.free {
		margin: 0;
		color: var(--nj-text-muted);
		font: 600 16px/1.4 var(--nj-font-body);
	}
</style>
