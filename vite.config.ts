import { readFileSync } from 'node:fs';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
	define: {
		__HOME_VERSION__: JSON.stringify(version)
	},
	plugins: [sveltekit()],
	server: { port: 5182, strictPort: true },
	test: {
		expect: { requireAssertions: true },
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
