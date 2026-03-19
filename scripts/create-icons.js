import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, '../static/platform-icons');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const platforms = [
  'youtube', 'tiktok', 'instagram', 'twitter', 'facebook', 'reddit', 
  'pinterest', 'bilibili', 'vimeo', 'niconico', 'rumble', 'soundcloud', 
  'bandcamp', 'dailymotion', 'odysee', 'vk', 'twitch'
];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <circle cx="12" cy="12" r="10" opacity="0.5"/>
</svg>`;

for (const p of platforms) {
  fs.writeFileSync(path.join(dir, `${p}.svg`), svg);
}

console.log('Icons generated.');
