<script lang="ts">
	/**
	 * One big box. An address goes straight there, a !bang goes to DuckDuckGo, anything else is
	 * searched. A plain GET form underneath, so it works without JavaScript too (via /search).
	 */
	import { searchTarget } from '../search.ts';

	interface Props {
		template: string;
		bangs: boolean;
		engine: string;
		placeholder: string;
		autofocus: boolean;
	}

	let { template, bangs, engine, placeholder, autofocus }: Props = $props();

	function go(event: SubmitEvent) {
		const form = event.currentTarget as HTMLFormElement;
		const input = form.elements.namedItem('q') as HTMLInputElement;
		event.preventDefault();
		const target = searchTarget(input.value, { template, bangs });
		if (target) location.assign(target.url);
	}

	function keys(event: KeyboardEvent) {
		// Esc leaves the box, so the number keys open links.
		if (event.key === 'Escape') (event.currentTarget as HTMLInputElement).blur();
	}
</script>

<form class="search" action="/search" method="get" role="search" onsubmit={go}>
	<label class="label nj-plate nj-plate--red" for="q">Search</label>
	<div class="box">
		<!-- svelte-ignore a11y_autofocus -->
		<input
			id="q"
			name="q"
			type="search"
			{placeholder}
			{autofocus}
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			enterkeyhint="go"
			aria-describedby="q-hint"
			onkeydown={keys}
		/>
		<button class="go" type="submit" aria-label="Go"><i aria-hidden="true"></i></button>
	</div>
	<p class="hint" id="q-hint">
		<span>{engine}</span>
		<span class="keys"
			><kbd>/</kbd> search · <kbd>Esc</kbd> then <kbd>1</kbd>–<kbd>9</kbd> links</span
		>
		{#if bangs}<span><b>!w</b> <b>!yt</b>… bangs work</span>{/if}
	</p>
</form>

<style>
	.search {
		position: relative;
		display: grid;
		gap: 8px;
		padding-top: 14px;
	}
	.label {
		position: absolute;
		z-index: 2;
		top: 0;
		left: 14px;
	}
	.box {
		position: relative;
		isolation: isolate;
		display: flex;
		align-items: stretch;
		transform: rotate(var(--nj-tilt-xs));
	}
	.box::before,
	.box::after {
		content: '';
		position: absolute;
		inset: 0;
		clip-path: polygon(0.6% 6%, 100% 0, 99.4% 100%, 0 92%);
	}
	.box::before {
		z-index: -1;
		background: var(--nj-paper);
	}
	.box::after {
		z-index: -2;
		background: var(--nj-accent);
		transform: translate(7px, 7px);
		transition: background-color var(--nj-fast);
	}
	.box:focus-within::after {
		background: var(--nj-hi);
	}
	input {
		flex: 1;
		min-width: 0;
		min-height: 60px;
		padding: 14px 8px 12px 20px;
		border: 0;
		background: none;
		color: var(--nj-ink);
		font: 700 22px/1.2 var(--nj-font-body);
		outline: none;
	}
	input::placeholder {
		color: var(--nj-locked);
		opacity: 1;
	}
	input::-webkit-search-cancel-button {
		display: none;
	}
	.box:focus-within {
		outline: 3px solid var(--nj-focus);
		outline-offset: 3px;
	}
	.go {
		flex: none;
		display: grid;
		place-items: center;
		width: 64px;
		margin: 8px 10px 8px 0;
		border: 0;
		background: var(--nj-ink);
		color: var(--nj-paper);
		cursor: pointer;
		clip-path: polygon(8% 0, 100% 6%, 92% 100%, 0 94%);
		transition: background-color var(--nj-fast);
	}
	.go:hover,
	.go:focus-visible {
		background: var(--nj-accent);
	}
	.go i {
		width: 16px;
		height: 20px;
		background: currentColor;
		clip-path: polygon(0 0, 100% 50%, 0 100%, 22% 50%);
	}
	.hint {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		margin: 12px 0 0 6px;
		color: var(--nj-text-muted);
		font: 600 13px/1.5 var(--nj-font-body);
		letter-spacing: 0.04em;
	}
	.hint b {
		color: var(--nj-text);
	}
	.keys {
		display: none;
	}
	@media (min-width: 760px) and (pointer: fine) {
		.keys {
			display: inline;
		}
	}
	@media (min-width: 760px) {
		input {
			min-height: 72px;
			font-size: 26px;
			padding-left: 26px;
		}
	}
</style>
