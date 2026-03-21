/**
 * URL parsing utilities for OmniGrab.
 * Used to detect playlist URLs vs single video URLs before making API calls.
 */

/** Known playlist URL patterns per platform */
const PLAYLIST_PATTERNS: RegExp[] = [
  /[?&]list=PL/i,           // YouTube playlist
  /[?&]list=/i,             // YouTube (any list param)
  /youtube\.com\/playlist/i, // YouTube /playlist page
  /tiktok\.com\/@[^/]+\/collection/i,
  /instagram\.com\/[^/]+\/saved/i,
  /soundcloud\.com\/[^/]+\/sets\//i,
  /bandcamp\.com\/album\//i,
  /vimeo\.com\/showcase\//i,
  /vimeo\.com\/album\//i,
  /dailymotion\.com\/playlist\/x/i,
  /bilibili\.com\/medialist\//i,
  /bilibili\.com\/channel\//i,
  /twitch\.tv\/[^/]+\/videos\?filter=collections/i,
];

/**
 * Returns true if the URL looks like a playlist rather than a single video.
 * This is a client-side heuristic — `yt-dlp --dump-json` is the ground truth.
 */
export function isPlaylistUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return PLAYLIST_PATTERNS.some((re) => re.test(u.href));
  } catch {
    return false;
  }
}

/** Attempt to extract a YouTube video ID from a URL. Returns null if not found. */
export function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    // Standard: youtube.com/watch?v=ID
    if (u.hostname.includes('youtube.com') && u.searchParams.has('v')) {
      return u.searchParams.get('v');
    }
    // Short: youtu.be/ID
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return id || null;
    }
    // Shorts: youtube.com/shorts/ID
    const shortsMatch = u.pathname.match(/\/shorts\/([^/?#]+)/);
    if (shortsMatch) return shortsMatch[1];
  } catch {
    // Not a valid URL
  }
  return null;
}

/** Normalise a URL: trim whitespace and ensure it has a scheme. */
export function normaliseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Add https:// if the user typed a bare domain
  if (trimmed.startsWith('www.') || trimmed.includes('.')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}
