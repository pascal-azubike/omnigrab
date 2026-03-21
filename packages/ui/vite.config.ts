import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
	const outDir =
		mode === 'android' ? '../../android/src/omnigrab_android/ui' : '../../desktop/src-tauri/ui-dist';

	return {
		plugins: [sveltekit(), tailwindcss()],
		build: {
			outDir,
			emptyOutDir: true
		},
		server: {
			port: 5173,
			strictPort: true
		}
	};
});
