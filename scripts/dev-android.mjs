#!/usr/bin/env node
/**
 * Android Development Script with Hot-Reload
 *
 * This script:
 * 1. Lists available Android devices and lets you select one
 * 2. Starts Vite dev server with host access
 * 3. Sets up ADB reverse port forwarding
 * 4. Configures the app to use the dev server
 * 5. Runs the Android app
 */

import { spawn, execSync, exec } from 'child_process';
import { createInterface } from 'readline';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PACKAGES_DIR = resolve(ROOT, 'packages');
const ANDROID_DIR = resolve(PACKAGES_DIR, 'android');
const UI_DIR = resolve(PACKAGES_DIR, 'ui');
const SETTINGS_PATH = resolve(ANDROID_DIR, 'src/omnigrab_android/settings.json');

const VITE_PORT = 5173;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], ...options });
  } catch (error) {
    return null;
  }
}

function runCommandAsync(cmd, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    proc.on('close', (code) => {
      if (code === 0 || code === null) {
        resolve(0);
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

async function getDevices() {
  const output = runCommand('adb devices -l');
  if (!output) return [];

  const lines = output.trim().split('\n').slice(1); // Skip header
  const devices = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(/\s+/);
    if (parts[0] && parts[1] === 'device') {
      const id = parts[0];
      const model = parts.find(p => p.startsWith('model:'))?.replace('model:', '') || 'Unknown';
      const device = parts.find(p => p.startsWith('device:'))?.replace('device:', '') || id;
      devices.push({
        id,
        name: `${model} (${device})`,
        model,
        device: device
      });
    }
  }

  return devices;
}

async function selectDevice(devices) {
  if (devices.length === 0) {
    log('No Android devices found. Make sure ADB is installed and a device is connected.', 'red');
    process.exit(1);
  }

  if (devices.length === 1) {
    log(`Using device: ${devices[0].name}`, 'green');
    return devices[0];
  }

  log('\nSelect a device:', 'cyan');
  devices.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.name}`);
  });

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('\nEnter device number (1-' + devices.length + '): ', (answer) => {
      rl.close();
      const index = parseInt(answer) - 1;
      if (index >= 0 && index < devices.length) {
        resolve(devices[index]);
      } else {
        log('Invalid selection. Using first device.', 'yellow');
        resolve(devices[0]);
      }
    });
  });
}

function setupAdbReverse(deviceId) {
  log('\nSetting up ADB port forwarding...', 'cyan');

  // Forward Vite dev server port (allow Android to access host's Vite server)
  const viteResult = runCommand(`adb -s ${deviceId} reverse tcp:${VITE_PORT} tcp:${VITE_PORT}`);
  if (viteResult !== null) {
    log(`  ✓ Port ${VITE_PORT} forwarded (Vite dev server)`, 'green');
  } else {
    log(`  ⚠ Failed to forward port ${VITE_PORT}`, 'yellow');
    log('  Make sure ADB is available and the device is connected.', 'yellow');
  }
}

function writeDevSettings(devUrl) {
  const settingsDir = dirname(SETTINGS_PATH);

  if (!existsSync(settingsDir)) {
    mkdirSync(settingsDir, { recursive: true });
  }

  const settings = {
    dev_url: devUrl,
    dev_mode: true
  };

  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  log(`\nWrote dev settings to ${SETTINGS_PATH}`, 'dim');
  log(`  dev_url: ${devUrl}`, 'dim');
}

async function startViteServer() {
  log('\nStarting Vite dev server...', 'cyan');

  const viteProcess = spawn('npm', ['run', 'dev'], {
    cwd: UI_DIR,
    stdio: 'inherit',
    shell: true
  });

  return new Promise((resolve) => {
    viteProcess.on('error', (err) => {
      log(`Failed to start Vite: ${err.message}`, 'red');
      resolve(null);
    });

    // Give Vite a moment to start
    setTimeout(() => {
      if (viteProcess.pid) {
        log(`  ✓ Vite dev server started on port ${VITE_PORT}`, 'green');
        resolve(viteProcess);
      }
    }, 2000);
  });
}

async function runApp(deviceId) {
  log('\nStarting Android app...', 'cyan');

  try {
    await runCommandAsync('briefcase', ['run', 'android', '-d', deviceId, '-u'], {
      cwd: ANDROID_DIR
    });
  } catch (error) {
    // briefcase exits when the app closes, which is expected
    log('App closed.', 'yellow');
  }
}

async function main() {
  log('\n🚀 OmniGrab Android Development Mode\n', 'cyan');

  // Step 1: Get available devices
  log('Scanning for Android devices...', 'cyan');
  const devices = await getDevices();

  if (devices.length === 0) {
    log('\nNo devices found. Please connect a device or start an emulator.', 'red');
    process.exit(1);
  }

  // Step 2: Select device
  const device = await selectDevice(devices);

  // Step 3: Setup ADB reverse for hot-reload
  setupAdbReverse(device.id);

  // Step 4: Write dev settings
  const devUrl = `http://127.0.0.1:${VITE_PORT}`;
  writeDevSettings(devUrl);

  // Step 5: Start Vite dev server
  const viteProcess = await startViteServer();
  if (!viteProcess) {
    process.exit(1);
  }

  // Step 6: Run the app
  log('\n📱 Starting app on device...', 'cyan');
  log('Press Ctrl+C to stop\n', 'dim');

  try {
    await runApp(device.id);
  } finally {
    // Cleanup
    log('\n\nCleaning up...', 'yellow');

    // Kill Vite process
    if (viteProcess) {
      viteProcess.kill('SIGTERM');
      log('  ✓ Vite server stopped', 'green');
    }

    // Remove dev settings to restore production mode
    try {
      if (existsSync(SETTINGS_PATH)) {
        const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
        delete settings.dev_url;
        delete settings.dev_mode;
        writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
        log('  ✓ Dev settings cleared', 'green');
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    // Remove ADB reverse
    runCommand(`adb -s ${device.id} reverse --remove tcp:${VITE_PORT}`);
    log('  ✓ ADB port forwarding removed', 'green');

    log('\nDone!', 'green');
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\nInterrupted!', 'yellow');
  process.exit(0);
});

main().catch((err) => {
  log(`Error: ${err.message}`, 'red');
  process.exit(1);
});