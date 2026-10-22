<script lang="ts">
	/** Where a section would be when its app isn't set up or isn't answering. */
	interface Props {
		state: 'off' | 'unavailable';
		hint: string;
	}

	let { state, hint }: Props = $props();
</script>

<div class="notice" role="status">
	<span
		class="nj-stamp"
		class:nj-stamp--down={state === 'unavailable'}
		class:nj-stamp--locked={state === 'off'}>{state === 'off' ? 'Not set up' : 'Unavailable'}</span
	>
	<p>{hint}</p>
</div>

<style>
	.notice {
		display: grid;
		justify-items: start;
		gap: 12px;
		padding: 18px 16px 16px;
		border: 2px dashed var(--nj-locked);
		background: var(--nj-ink);
	}
	p {
		margin: 0;
		color: var(--nj-text-muted);
		font: 600 15px/1.4 var(--nj-font-body);
	}
</style>
