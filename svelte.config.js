import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter(),
		// The app answers on three hosts behind Traefik and Cloudflare, where the scheme it sees
		// is not always the one the browser used. hooks.server.ts checks that form posts come from
		// the same host instead.
		csrf: { trustedOrigins: ['*'] },
		// Absolute asset paths, so the font preload headers resolve the same on every route.
		paths: { relative: false },
		// PUBLIC_URL (the brief's shared name) is a server setting here, not a browser one.
		env: { publicPrefix: 'BROWSER_' },
		alias: { $lib: 'src/lib' }
	}
};

export default config;
