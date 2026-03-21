import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

const mode = process.env.VITE_MODE || 'desktop';
const pages = mode === 'android' 
  ? '../android/src/omnigrab_android/ui' 
  : '../desktop/ui-dist';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: pages,
      assets: pages,
      fallback: 'index.html',
    }),
  },
};

export default config;
