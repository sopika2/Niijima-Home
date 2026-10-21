<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Loader, Wordmark } from '@niijima/design/svelte';
	import Agenda from '$lib/components/Agenda.svelte';
	import Header from '$lib/components/Header.svelte';
	import LinkGroups from '$lib/components/LinkGroups.svelte';
	import NetworkTiles from '$lib/components/NetworkTiles.svelte';
	import Notice from '$lib/components/Notice.svelte';
	import SearchBox from '$lib/components/SearchBox.svelte';
	import SectionTitle from '$lib/components/SectionTitle.svelte';
	import Treasury from '$lib/components/Treasury.svelte';
	import type { SectionId } from '$lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const links = $derived(data.groups.flatMap((group) => group.links).filter((link) => link.key));

	// "Take your time" only when switching takes long enough to notice.
	let busy = $state(false);
	async function switched() {
		const timer = setTimeout(() => (busy = true), 300);
		try {
			await invalidateAll();
		} finally {
			clearTimeout(timer);
			busy = false;
		}
	}

	/** "/" jumps to the search box; 1–9 open the first nine links (Shift: in a new tab). */
	function shortcuts(event: KeyboardEvent) {
		if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
		const target = event.target as HTMLElement | null;
		if (target?.closest('input, textarea, select, [contenteditable]')) return;
		if (event.key === '/') {
			event.preventDefault();
			document.getElementById('q')?.focus();
			return;
		}
		const digit = /^Digit([1-9])$/.exec(event.code)?.[1];
		const link = digit ? links.find((item) => item.key === Number(digit)) : undefined;
		if (!link) return;
		event.preventDefault();
		if (event.shiftKey) window.open(link.url, '_blank', 'noopener');
		else location.assign(link.url);
	}
</script>

<svelte:window onkeydown={shortcuts} />

{#snippet section(id: SectionId)}
	{#if id === 'search'}
		<SearchBox {...data.search} />
	{:else if id === 'network'}
		<section class="block" aria-label="Network">
			<SectionTitle text="Network" />
			<NetworkTiles tiles={data.tiles} />
		</section>
	{:else if id === 'links'}
		<section class="block" aria-label="Links">
			<SectionTitle text="Links" />
			<LinkGroups groups={data.groups} persona={data.persona} />
		</section>
	{:else if id === 'today' && data.today}
		<section class="block panel" aria-label="Today">
			<SectionTitle text="Today" href={data.todayLink} action="Calendar" />
			{#if data.today.state === 'ok'}
				<Agenda days={data.today.value} persona={data.persona} span={data.todayDays} />
			{:else}
				<Notice state={data.today.state} hint={data.today.hint} />
			{/if}
		</section>
	{:else if id === 'treasury' && data.treasury}
		<section class="block panel" aria-label="Treasury">
			<SectionTitle text="Treasury" href={data.treasuryLink} action="Treasure" />
			{#if data.treasury.state === 'ok'}
				<Treasury view={data.treasury.value} />
			{:else}
				<Notice state={data.treasury.state} hint={data.treasury.hint} />
			{/if}
		</section>
	{/if}
{/snippet}

<Header
	greeting={data.greeting}
	weather={data.weather}
	timezone={data.timezone}
	persona={data.persona}
	fixed={data.personaFixed}
	onswitch={switched}
/>

<main class="board">
	{#each data.rows as row (row.order)}
		{#if row.kind === 'full'}
			<div class="cell" style="order:{row.order}">{@render section(row.section)}</div>
		{:else}
			<div
				class="split"
				class:solo={row.main.length === 0 || row.side.length === 0}
				style="order:{row.order}"
			>
				{#if row.main.length > 0}
					<div class="col">
						{#each row.main as item (item.section)}
							<div class="cell" style="order:{item.order}">{@render section(item.section)}</div>
						{/each}
					</div>
				{/if}
				{#if row.side.length > 0}
					<div class="col">
						{#each row.side as item (item.section)}
							<div class="cell" style="order:{item.order}">{@render section(item.section)}</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	{/each}
</main>

<footer class="foot">
	<Wordmark href="https://niijimasisters.com" />
	{#if data.user}
		<form method="post" action="/auth/logout" class="out">
			<span>Signed in as <b>{data.user.name}</b></span>
			<button
				type="submit"
				class="nj-btn nj-btn--ghost nj-btn--small"
				title="Signs you out on every Niijima site">Sign out</button
			>
		</form>
	{/if}
	<p class="credit">Fan site · Persona 5 © ATLUS / SEGA · not affiliated</p>
</footer>

{#if busy}<Loader />{/if}

<style>
	.board {
		display: flex;
		flex-direction: column;
		gap: 34px;
		width: min(100%, 1240px);
		margin: 0 auto;
		padding: 8px 16px 40px;
	}
	/* On a phone every section stacks in the configured order. */
	.split,
	.col {
		display: contents;
	}
	.cell {
		min-width: 0;
	}
	.panel {
		padding: 18px 16px 16px;
		background: var(--nj-surface);
		border-left: 6px solid var(--nj-accent);
		clip-path: polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%);
	}
	.foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 18px 24px;
		width: min(100%, 1240px);
		margin: 0 auto;
		padding: 22px 16px 40px 20px;
		border-top: 2px solid var(--nj-surface-raised);
	}
	.out {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 16px;
		color: var(--nj-text-muted);
		font: 600 14px/1.3 var(--nj-font-body);
	}
	.out b {
		color: var(--nj-text);
	}
	.credit {
		margin: 0;
		color: var(--nj-text-muted);
		font: 600 11px/1.35 var(--nj-font-body);
		letter-spacing: 0.06em;
	}

	@media (min-width: 1000px) {
		.board {
			padding: 12px 24px 48px;
			gap: 40px;
		}
		.split {
			display: grid;
			grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
			align-items: start;
			gap: 40px;
		}
		.split.solo {
			grid-template-columns: minmax(0, 1fr);
		}
		.col {
			display: flex;
			flex-direction: column;
			gap: 34px;
		}
		.foot {
			padding-inline: 24px;
		}
	}
</style>
