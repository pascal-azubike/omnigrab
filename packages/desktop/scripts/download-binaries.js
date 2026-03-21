#!/usr/bin/env node
/**
 * OmniGrab - Binary Downloader Script
 * Downloads yt-dlp and ffmpeg binaries for all target platforms
 * and places them in src-tauri/binaries/ with the correct target triple suffix.
 * 
 * Run: node scripts/download-binaries.js
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// In Tauri v2, sidecars in the crate root (src-tauri/) are reliably found.
const BINARIES_DIR = path.join(__dirname, '..', 'src-tauri');

// Ensure the directory exists
if (!fs.existsSync(BINARIES_DIR)) {
  fs.mkdirSync(BINARIES_DIR, { recursive: true });
}
console.log(`📂 Output directory: ${BINARIES_DIR}`);

import { execSync } from 'child_process';

// yt-dlp platform targets
const YT_DLP_TARGETS = [
  { triple: 'x86_64-pc-windows-msvc',      asset: 'yt-dlp.exe',            ext: '.exe' },
  { triple: 'x86_64-unknown-linux-gnu',     asset: 'yt-dlp_linux',          ext: ''     },
  { triple: 'aarch64-unknown-linux-gnu',    asset: 'yt-dlp_linux_aarch64',  ext: ''     },
  { triple: 'x86_64-apple-darwin',          asset: 'yt-dlp_macos',          ext: ''     },
  { triple: 'aarch64-apple-darwin',         asset: 'yt-dlp_macos',          ext: ''     },
  { triple: 'aarch64-linux-android',        asset: 'yt-dlp_linux_aarch64',  ext: ''     },
  { triple: 'x86_64-linux-android',         asset: 'yt-dlp_linux',          ext: ''     },
];

// ffmpeg platform downloads from BtbN/FFmpeg-Builds
const FFMPEG_TARGETS = [
  {
    triple: 'x86_64-pc-windows-msvc',
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    binary: 'ffmpeg.exe',
    ext: '.exe',
    isZip: true,
    zipPath: 'ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe',
  },
  {
    triple: 'x86_64-unknown-linux-gnu',
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz',
    binary: 'ffmpeg',
    ext: '',
    isZip: false,
    tarPath: 'ffmpeg-master-latest-linux64-gpl/bin/ffmpeg',
  },
  {
    triple: 'aarch64-unknown-linux-gnu',
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linuxarm64-gpl.tar.xz',
    binary: 'ffmpeg',
    ext: '',
    isZip: false,
    tarPath: 'ffmpeg-master-latest-linuxarm64-gpl/bin/ffmpeg',
  },
  {
    triple: 'x86_64-apple-darwin',
    url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
    binary: 'ffmpeg',
    ext: '',
    isZip: true,
    zipPath: 'ffmpeg',
  },
  {
    triple: 'aarch64-apple-darwin',
    url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
    binary: 'ffmpeg',
    ext: '',
    isZip: true,
    zipPath: 'ffmpeg',
  },
  {
    triple: 'aarch64-linux-android',
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linuxarm64-gpl.tar.xz',
    binary: 'ffmpeg',
    ext: '',
    isZip: false,
    tarPath: 'ffmpeg-master-latest-linuxarm64-gpl/bin/ffmpeg',
  },
  {
    triple: 'x86_64-linux-android',
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz',
    binary: 'ffmpeg',
    ext: '',
    isZip: false,
    tarPath: 'ffmpeg-master-latest-linux64-gpl/bin/ffmpeg',
  },
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'OmniGrab-BinaryDownloader/1.0' };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    https.get(url, { headers }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        return reject(new Error(`GitHub API returned ${res.statusCode} for ${url}. ${res.statusCode === 403 ? 'Rate limit exceeded.' : ''}`));
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse JSON response from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// #28: Retry wrapper — 3 attempts with exponential backoff
async function withRetry(fn, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  ⚠ Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2; // exponential backoff
    }
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const request = https.get(url, {
      headers: { 'User-Agent': 'OmniGrab-BinaryDownloader/1.0' }
    }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let downloaded = 0;
      res.on('data', chunk => {
        downloaded += chunk.length;
        if (total > 0) {
          const pct = ((downloaded / total) * 100).toFixed(1);
          process.stdout.write(`\r  ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)`);
        }
      });
      res.pipe(file);
      file.on('finish', () => { file.close(); console.log(''); resolve(); });
    });
    request.on('error', err => { fs.unlinkSync(dest); reject(err); });
  });
}

async function downloadYtDlp() {
  console.log('\n📦 Fetching latest yt-dlp release info...');
  const release = await fetchJson('https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest');
  console.log(`   Version: ${release.tag_name}`);

  const assets = release.assets;

  for (const target of YT_DLP_TARGETS) {
    const destName = `yt-dlp-${target.triple}${target.ext}`;
    const destPath = path.join(BINARIES_DIR, destName);

    if (fs.existsSync(destPath)) {
      console.log(`  ✓ ${destName} already exists, skipping`);
      continue;
    }

    const asset = assets.find(a => a.name === target.asset);
    if (!asset) {
      console.warn(`  ⚠ Asset '${target.asset}' not found in release, skipping ${target.triple}`);
      continue;
    }

    console.log(`  ⬇ Downloading ${destName} from ${asset.browser_download_url}`);
    // #28: wrap download in retry logic
    await withRetry(() => downloadFile(asset.browser_download_url, destPath));

    // Make executable on Unix
    if (!target.ext) {
      fs.chmodSync(destPath, 0o755);
    }
    console.log(`  ✓ Saved ${destName}`);
  }
}

async function downloadFfmpeg() {
  console.log('\n📦 Downloading ffmpeg binaries...');
  
  for (const target of FFMPEG_TARGETS) {
    const destName = `ffmpeg-${target.triple}${target.ext}`;
    const destPath = path.join(BINARIES_DIR, destName);

    if (fs.existsSync(destPath)) {
      console.log(`  ✓ ${destName} already exists, skipping`);
      continue;
    }

    console.log(`  ⬇ Downloading ffmpeg for ${target.triple}...`);
    
    const tmpPath = path.join(BINARIES_DIR, `_tmp_ffmpeg_${target.triple}`);
    try {
      await withRetry(() => downloadFile(target.url, tmpPath));
      
      if (target.isZip) {
        console.log(`  📂 Extracting from ZIP...`);
        if (process.platform === 'win32') {
          execSync(`powershell -Command "Expand-Archive -Path '${tmpPath}' -DestinationPath '${BINARIES_DIR}' -Force"`);
        } else {
          execSync(`unzip -o "${tmpPath}" -d "${BINARIES_DIR}"`);
        }
        
        const extractedPath = path.join(BINARIES_DIR, target.zipPath);
        if (fs.existsSync(extractedPath)) {
          fs.renameSync(extractedPath, destPath);
        }
      } else {
        console.log(`  📂 Extracting from tar.xz...`);
        // Use --strip-components to reliably extract the binary regardless of the top-level folder name
        // Most BtbN archives are 2 levels deep to the binary: folder/bin/ffmpeg
        execSync(`tar -xJf "${tmpPath}" -C "${BINARIES_DIR}" --strip-components 2 "${target.tarPath}"`);
        const extractedBinary = path.join(BINARIES_DIR, target.binary);
        if (fs.existsSync(extractedBinary)) {
          fs.renameSync(extractedBinary, destPath);
        }
      }
      
      // Cleanup: Remove the top-level folder if it was extracted (isZip might extract a folder)
      if (target.isZip || !target.isZip) {
        const topLevelFolder = target.isZip ? target.zipPath.split('/')[0] : target.tarPath.split('/')[0];
        const folderPath = path.join(BINARIES_DIR, topLevelFolder);
        if (fs.existsSync(folderPath) && fs.lstatSync(folderPath).isDirectory()) {
          fs.rmSync(folderPath, { recursive: true, force: true });
        }
      }

      // Final verification
      if (!fs.existsSync(destPath)) {
        throw new Error(`Binary failed to extract to expected path: ${destPath}`);
      }
      
      // Make executable on Unix
      if (!target.ext) {
        fs.chmodSync(destPath, 0o755);
      }

      console.log(`  ✓ Successfully processed ${destName}`);
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (err) {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      throw err; // Re-throw to signal failure
    }
  }
}

async function main() {
  console.log('🚀 OmniGrab Binary Downloader');
  console.log('================================');
  
  await downloadYtDlp();
  await downloadFfmpeg();

  console.log('\n✅ Done! Binaries are in src-tauri/');
  console.log('   Run: npm run tauri dev\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
