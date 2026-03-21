import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(({ mode }) => {
  // Determine output dir based on build mode
  const outDir = mode === 'android'
    ? path.resolve(__dirname, '../android/src/omnigrab_android/ui')
    : path.resolve(__dirname, '../desktop/src-tauri/ui-dist');

  const isDesktop = mode !== 'android';

  return {
    plugins: [tailwindcss(), sveltekit()],
    clearScreen: false,
    server: {
      port: 5173,
      strictPort: true,
      host: host || false,
      hmr: host
        ? { protocol: 'ws', host, port: 5183 }
        : undefined,
      watch: {
        ignored: ['**/src-tauri/**'],
      },
    },
    envPrefix: ['VITE_', 'TAURI_ENV_*'],
    build: {
      outDir,
      emptyOutDir: true,
      target: isDesktop
        ? (process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13')
        : 'chrome100', // Android WebView is based on Chromium
      minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
      sourcemap: !!process.env.TAURI_ENV_DEBUG,
    },
    define: {
      __BUILD_MODE__: JSON.stringify(mode),
    },
  };
});
