<script lang="ts">
	/**
	 * The money from Treasure: the total in big numerals, the month-end forecast and the next
	 * bills. Hide/Show is remembered on this device; hidden by default on phones.
	 */
	import { moneyText as text, toggleMoney as toggle } from '../money.ts';
	import type { TreasuryView } from '../types.ts';

	interface Props {
		view: TreasuryView;
	}

	let { view }: Props = $props();
</script>

<div class="treasury">
	<p class="total" aria-label="Total">
		<span class="nj-money">
			{#if view.total.negative}<span class="sign">−</span>{/if}{#if view.total.symbolFirst}<span
					class="sym">{view.total.symbol}</span
				>{/if}<span class="num">{view.total.amount}</span>{#if !view.total.symbolFirst}<span
					class="sym">{view.total.symbol}</span
				>{/if}
		</span>
		<span class="nj-money-mask num" aria-label="Hidden">✱✱✱✱✱✱</span>
	</p>
	<button type="button" class="peek nj-btn nj-btn--ghost nj-btn--small" onclick={toggle}>
		<span class="nj-money">Hide</span><span class="nj-money-mask">Show</span>
	</button>

	{#if view.endOfMonth}
		<p class="row">
			<span>End of month</span><b
				><span class="nj-money">{text(view.endOfMonth)}</span><span class="nj-money-mask">✱✱✱✱</span
				></b
			>
		</p>
	{/if}
	{#if view.bills.length > 0}
		<h3 class="sub">Next bills</h3>
		<ul class="bills">
			{#each view.bills as bill, i (i)}
				<li class="row">
					<span><span class="when">{bill.when}</span> {bill.name}</span><b
						><span class="nj-money">{text(bill.amount)}</span><span class="nj-money-mask">✱✱✱</span
						></b
					>
				</li>
			{/each}
		</ul>
	{/if}
	{#if view.verdicts > 0 || view.missingRates.length > 0}
		<p class="flags">
			{#if view.verdicts > 0}<span class="nj-stamp nj-stamp--pending"
					>{view.verdicts} verdict{view.verdicts === 1 ? '' : 's'}</span
				>{/if}
			{#if view.missingRates.length > 0}<span class="note"
					>No rate for {view.missingRates.join(', ')}: left out of the total.</span
				>{/if}
		</p>
	{/if}
</div>

<style>
	.treasury {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
		gap: 10px 12px;
	}
	.total {
		margin: 0;
		min-height: 1.1em;
		color: var(--nj-paper);
		font: 400 clamp(40px, 12vw, 60px) / 1.05 var(--nj-font-display);
		letter-spacing: 0.01em;
		white-space: nowrap;
		text-shadow:
			3px 3px 0 var(--nj-ink),
			6px 6px 0 var(--nj-accent);
		transform: rotate(var(--nj-tilt-sm)) skewX(-6deg);
		transform-origin: 0 100%;
	}
	.sym {
		margin: 0 0.12em;
		font-size: 0.5em;
		color: var(--nj-hi);
	}
	.peek {
		align-self: center;
		min-height: 44px;
	}
	.row,
	.sub,
	.flags,
	.bills {
		grid-column: 1 / -1;
		margin: 0;
	}
	.row {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 6px 0;
		border-bottom: 1px solid color-mix(in srgb, var(--nj-paper) 10%, transparent);
		font: 600 15px/1.35 var(--nj-font-body);
	}
	.row b {
		flex: none;
		color: var(--nj-text);
		font: 400 18px/1.2 var(--nj-font-display);
		letter-spacing: 0.02em;
	}
	.sub {
		margin-top: 8px;
		color: var(--nj-text-muted);
		font: 800 12px/1 var(--nj-font-body);
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}
	.bills {
		padding: 0;
		list-style: none;
	}
	.when {
		color: var(--nj-hi);
		font-weight: 700;
	}
	.flags {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		margin-top: 6px;
	}
	.note {
		color: var(--nj-text-muted);
		font: 600 13px/1.35 var(--nj-font-body);
	}
</style>
