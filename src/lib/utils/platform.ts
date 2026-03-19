// Platform detection utility for OmniGrab

export interface PlatformInfo {
  name: string;
  color: string;
  icon: string;
  supportsPlaylist: boolean;
  className: string;
}

const PLATFORMS: Record<string, PlatformInfo> = {
  youtube: {
    name: 'YouTube',
    color: '#ff0000',
    icon: 'youtube',
    supportsPlaylist: true,
    className: 'platform-youtube',
  },
  tiktok: {
    name: 'TikTok',
    color: '#69c9d0',
    icon: 'tiktok',
    supportsPlaylist: true,
    className: 'platform-tiktok',
  },
  instagram: {
    name: 'Instagram',
    color: '#e1306c',
    icon: 'instagram',
    supportsPlaylist: true,
    className: 'platform-instagram',
  },
  twitter: {
    name: 'Twitter / X',
    color: '#1da1f2',
    icon: 'twitter',
    supportsPlaylist: false,
    className: 'platform-twitter',
  },
  facebook: {
    name: 'Facebook',
    color: '#1877f2',
    icon: 'facebook',
    supportsPlaylist: true,
    className: 'platform-facebook',
  },
  reddit: {
    name: 'Reddit',
    color: '#ff4500',
    icon: 'reddit',
    supportsPlaylist: false,
    className: 'platform-reddit',
  },
  vimeo: {
    name: 'Vimeo',
    color: '#1ab7ea',
    icon: 'vimeo',
    supportsPlaylist: true,
    className: 'platform-vimeo',
  },
  twitch: {
    name: 'Twitch',
    color: '#9147ff',
    icon: 'twitch',
    supportsPlaylist: true,
    className: 'platform-twitch',
  },
  soundcloud: {
    name: 'SoundCloud',
    color: '#ff5500',
    icon: 'soundcloud',
    supportsPlaylist: true,
    className: 'platform-soundcloud',
  },
  bandcamp: {
    name: 'Bandcamp',
    color: '#1da0c3',
    icon: 'bandcamp',
    supportsPlaylist: true,
    className: 'platform-bandcamp',
  },
  dailymotion: {
    name: 'Dailymotion',
    color: '#0066dc',
    icon: 'dailymotion',
    supportsPlaylist: true,
    className: 'platform-dailymotion',
  },
  bilibili: {
    name: 'Bilibili',
    color: '#fb7299',
    icon: 'bilibili',
    supportsPlaylist: true,
    className: 'platform-bilibili',
  },
  rumble: {
    name: 'Rumble',
    color: '#85c742',
    icon: 'rumble',
    supportsPlaylist: true,
    className: 'platform-rumble',
  },
  odysee: {
    name: 'Odysee',
    color: '#ef1970',
    icon: 'odysee',
    supportsPlaylist: true,
    className: 'platform-odysee',
  },
  pinterest: {
    name: 'Pinterest',
    color: '#e60023',
    icon: 'pinterest',
    supportsPlaylist: true,
    className: 'platform-pinterest',
  },
  niconico: {
    name: 'Niconico',
    color: '#252525',
    icon: 'niconico',
    supportsPlaylist: true,
    className: '',
  },
  vk: {
    name: 'VK',
    color: '#4a76a8',
    icon: 'vk',
    supportsPlaylist: true,
    className: '',
  },
};

const DOMAIN_MAP: Record<string, string> = {
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'm.youtube.com': 'youtube',
  'tiktok.com': 'tiktok',
  'www.tiktok.com': 'tiktok',
  'instagram.com': 'instagram',
  'www.instagram.com': 'instagram',
  'twitter.com': 'twitter',
  'x.com': 'twitter',
  'www.twitter.com': 'twitter',
  'www.x.com': 'twitter',
  'facebook.com': 'facebook',
  'www.facebook.com': 'facebook',
  'fb.com': 'facebook',
  'fb.watch': 'facebook',
  'reddit.com': 'reddit',
  'www.reddit.com': 'reddit',
  'v.reddit.com': 'reddit',
  'vimeo.com': 'vimeo',
  'www.vimeo.com': 'vimeo',
  'twitch.tv': 'twitch',
  'www.twitch.tv': 'twitch',
  'soundcloud.com': 'soundcloud',
  'www.soundcloud.com': 'soundcloud',
  'bandcamp.com': 'bandcamp',
  'dailymotion.com': 'dailymotion',
  'www.dailymotion.com': 'dailymotion',
  'bilibili.com': 'bilibili',
  'www.bilibili.com': 'bilibili',
  'b23.tv': 'bilibili',
  'rumble.com': 'rumble',
  'odysee.com': 'odysee',
  'pinterest.com': 'pinterest',
  'www.pinterest.com': 'pinterest',
  'pin.it': 'pinterest',
  'nicovideo.jp': 'niconico',
  'www.nicovideo.jp': 'niconico',
  'nico.ms': 'niconico',
  'vk.com': 'vk',
  'www.vk.com': 'vk',
};

export function detectPlatform(url: string): PlatformInfo | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    
    // Try exact match first
    const fullHost = parsed.hostname.toLowerCase();
    const key = DOMAIN_MAP[fullHost] || DOMAIN_MAP[hostname];
    
    if (key && PLATFORMS[key]) {
      return PLATFORMS[key];
    }
    
    // Fallback: check if any known domain is a substring
    for (const [domain, platformKey] of Object.entries(DOMAIN_MAP)) {
      if (fullHost.endsWith(domain)) {
        return PLATFORMS[platformKey] || null;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

export function isPlaylistUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const params = parsed.searchParams;
    // YouTube playlist
    if (params.get('list')) return true;
    // Generic playlist patterns in path
    const path = parsed.pathname.toLowerCase();
    return (
      path.includes('/playlist') ||
      path.includes('/album') ||
      path.includes('/sets/') ||
      path.includes('/series') ||
      path.includes('/videos') ||
      path.includes('/channel/') ||
      path.includes('/c/') ||
      path.includes('/user/')
    );
  } catch {
    return false;
  }
}

export { PLATFORMS };
