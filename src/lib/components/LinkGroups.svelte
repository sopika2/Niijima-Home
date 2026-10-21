<script lang="ts">
	/** Your bookmarks, group by group. The first nine show the number key that opens them. */
	import type { Persona } from '@niijima/design';
	import { ownerTag } from '../owner.ts';
	import type { GroupView } from '../types.ts';

	interface Props {
		groups: readonly GroupView[];
		persona: Persona;
	}

	let { groups, persona }: Props = $props();
</script>

{#if groups.length === 0}
	<p class="empty">
		No links yet. Add your bookmarks under <code>links:</code> in config.yml: each sister's own groups
		and the shared ones.
	</p>
{:else}
	<div class="groups">
		{#each groups as group, g (g)}
			{@const tag = ownerTag(group.owner, persona)}
			<section class="group" aria-label={group.title}>
				<h3 class="head">
					<span class="nj-plate" class:nj-plate--paper={g % 2 === 1}>{group.title}</span>
					{#if tag}<span class="tag">{tag}</span>{/if}
				</h3>
				<ul class="links">
					{#each group.links as link, i (i)}
						<li>
							<a class="link" href={link.url} title={link.host}>
								{#if link.icon}
									<img
										class="icon"
										src={link.icon}
										alt=""
										width="20"
										height="20"
										decoding="async"
									/>
								{:else}
									<span class="icon letter tone-{link.tone}" aria-hidden="true">{link.letter}</span>
								{/if}
								<span class="label">{link.label}</span>
								{#if link.key}<kbd class="key" aria-label="key {link.key}">{link.key}</kbd>{/if}
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
{/if}

<style>
	.groups {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
		gap: 26px 22px;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0 0 10px;
	}
	.tag {
		padding: 2px 6px 1px;
		border: 1px dashed var(--nj-hi-2);
		color: var(--nj-hi-2);
		font: 700 11px/1.3 var(--nj-font-body);
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.links {
		display: grid;
		gap: 2px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.link {
		position: relative;
		isolation: isolate;
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		padding: 6px 10px 6px 8px;
		color: var(--nj-text);
		text-decoration: none;
		font: 600 17px/1.2 var(--nj-font-body);
	}
	.link::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: var(--nj-accent);
		clip-path: polygon(0 10%, 100% 0, 97% 100%, 1% 92%);
		transform: scaleX(0);
		transform-origin: 0 50%;
		transition: transform var(--nj-fast) var(--nj-cut);
	}
	.link:hover::before,
	.link:focus-visible::before {
		transform: scaleX(1);
	}
	.link:hover,
	.link:focus-visible {
		color: var(--nj-paper);
	}
	.icon {
		flex: none;
		width: 20px;
		height: 20px;
		object-fit: contain;
	}
	.letter {
		display: grid;
		place-items: center;
		font: 400 14px/1 var(--nj-font-display);
		transform: rotate(-6deg);
	}
	.tone-0 {
		background: var(--nj-red);
		color: var(--nj-paper);
	}
	.tone-1 {
		background: var(--nj-paper);
		color: var(--nj-ink);
	}
	.tone-2 {
		background: var(--nj-hi);
		color: var(--nj-hi-ink);
	}
	.label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.key {
		display: none;
	}
	@media (pointer: fine) {
		.key {
			display: inline-block;
		}
	}
	.empty {
		margin: 0;
		color: var(--nj-text-muted);
		font: 600 16px/1.45 var(--nj-font-body);
	}
	code {
		color: var(--nj-hi);
	}
</style>
