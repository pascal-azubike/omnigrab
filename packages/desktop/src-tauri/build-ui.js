const { execSync } = require('child_process');
const path = require('path');

// Traverse up from packages/desktop/src-tauri to root
const root = path.resolve(__dirname, '../../..');

console.log(`[OmniGrab] Building Shared UI from monorepo root: ${root}`);

try {
  // Use npm --prefix to be extra safe
  execSync('npm run build:ui', { 
    cwd: root, 
    stdio: 'inherit',
    shell: true 
  });
  console.log('[OmniGrab] UI Build Complete.');
} catch (e) {
  console.error('[OmniGrab] UI Build Failed.');
  process.exit(1);
}
