import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: process.env.npm_lifecycle_event === 'build:android' 
				? '../android/app/src/main/python/ui' 
				: 'build',
			assets: process.env.npm_lifecycle_event === 'build:android' 
				? '../android/app/src/main/python/ui' 
				: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: true
		}),
		paths: {
			relative: true
		}
	}
};

export default config;
