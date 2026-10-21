import type { Runtime } from './runtime.ts';

/** This app's own hosts: PUBLIC_URL's and the sisters' (config.yml → hosts). */
export function ownHosts(app: Runtime): string[] {
	const hosts = Object.keys(app.config().hosts);
	if (app.settings.publicUrl) hosts.push(new URL(app.settings.publicUrl).host);
	return hosts;
}
