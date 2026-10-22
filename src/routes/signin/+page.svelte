<script lang="ts">
	/** The way in, drawn like the landing page's Network screen. */
	import { Bands, Button, DateHud, Ransom, Wordmark } from '@niijima/design/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const MESSAGES: Record<string, { tone: 'info' | 'warning' | 'danger'; text: string }> = {
		signed_out: { tone: 'info', text: 'Signed out. See you soon.' },
		expired: { tone: 'warning', text: 'That sign-in took too long. Try again.' },
		failed: { tone: 'warning', text: "Discord didn't confirm the sign-in. Try again." },
		refused: { tone: 'danger', text: "This Discord account isn't on the list." }
	};
	const message = $derived(data.message ? MESSAGES[data.message] : null);
	const href = $derived(
		data.next === '/' ? '/auth/login' : `/auth/login?next=${encodeURIComponent(data.next)}`
	);

	let copied = $state(false);
	async function copyId() {
		if (!data.refusedId) return;
		try {
			await navigator.clipboard.writeText(data.refusedId);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}
</script>

<svelte:head>
	<title>Sign in · {data.title}</title>
</svelte:head>

<main class="net">
	<Bands ghost="Network" />
	<div class="hud"><DateHud timeZone={data.timezone} size="var(--hud-size)" /></div>

	<div class="body">
		<Wordmark name="Niijima Home" />
		<Ransom as="h1" class="title" text="TAKE YOUR TIME" seed="signin" animate />

		<div class="nj-speech">
			<div class="nj-speech__tag"><b>0</b><span>The Fool</span></div>
			<div class="nj-speech__card">
				<p class="nj-speech__title">Members only</p>
				<p class="nj-speech__text">
					This is a private start page. Sign in with Discord once and it remembers you on every
					Niijima site.
				</p>
				{#if message}
					<div
						class="message"
						data-tone={message.tone}
						role={message.tone === 'danger' ? 'alert' : 'status'}
					>
						<p>{message.text}</p>
						{#if data.refusedId}
							<p class="help">
								Your Discord id is below. Add it to config.yml under access.discord_user_ids, then
								sign in again.
							</p>
							<button type="button" class="id" onclick={copyId}
								><code>{data.refusedId}</code><span>{copied ? 'Copied' : 'Copy'}</span></button
							>
						{/if}
					</div>
				{/if}
				<Button {href} variant="red">Sign in with Discord</Button>
			</div>
		</div>
	</div>

	<p class="credit">Fan site · Persona 5 © ATLUS / SEGA · not affiliated</p>
</main>

<style>
	.net {
		--hud-size: 46px;
		position: relative;
		isolation: isolate;
		display: grid;
		align-content: center;
		min-height: 100dvh;
		overflow: hidden;
		padding: 150px 16px 64px;
	}
	.hud {
		position: absolute;
		top: 34px;
		left: 30px;
	}
	.body {
		display: grid;
		justify-items: start;
		gap: 26px;
		width: min(100%, 560px);
		margin: 0 auto;
	}
	.body :global(.title) {
		--nj-ransom-size: clamp(34px, 9vw, 64px);
		transform: rotate(-4deg);
		transform-origin: 0 100%;
	}
	.nj-speech {
		width: 100%;
		margin-top: 40px;
	}
	.nj-speech__card {
		display: grid;
		justify-items: start;
		gap: 4px;
		padding-bottom: 30px;
	}
	.message {
		display: grid;
		gap: 8px;
		width: 100%;
		margin: 0 0 18px;
		padding: 10px 14px;
		border: 2px solid var(--nj-ink);
		background: var(--nj-sae-gold);
		color: var(--nj-ink);
		font: 700 15px/1.4 var(--nj-font-body);
	}
	.message[data-tone='danger'] {
		background: var(--nj-ink);
		color: var(--nj-paper);
		border-color: var(--nj-accent);
	}
	.message p {
		margin: 0;
	}
	.help {
		font-weight: 600;
		font-size: 14px;
	}
	.id {
		display: inline-flex;
		align-items: center;
		justify-self: start;
		gap: 10px;
		min-height: 44px;
		padding: 4px 12px;
		border: 2px dashed currentColor;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
	.credit {
		position: absolute;
		right: 16px;
		bottom: 12px;
		left: 16px;
		margin: 0;
		color: var(--nj-text-muted);
		font: 600 11px/1.35 var(--nj-font-body);
		letter-spacing: 0.06em;
		text-align: right;
	}
	@media (min-width: 760px) {
		.net {
			--hud-size: 64px;
			padding: 120px 48px 64px;
		}
		.hud {
			top: 48px;
			left: 56px;
		}
	}
</style>
