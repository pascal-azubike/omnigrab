/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format bytes per second into human-readable speed
 */
export function formatSpeed(bytesPerSecond: number | string): string {
  if (!bytesPerSecond || bytesPerSecond === 'N/A' || bytesPerSecond === 'None') return '—';
  const num = typeof bytesPerSecond === 'string'
    ? parseFloat(bytesPerSecond) || 0
    : bytesPerSecond;
  return `${formatBytes(num)}/s`;
}

/**
 * Format seconds into human-readable duration (e.g. "1:23:45")
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format ETA seconds into readable string
 */
export function formatEta(eta: number | string): string {
  if (!eta || eta === 'N/A' || eta === 'None' || eta === '--') return '—';
  const num = typeof eta === 'string' ? parseFloat(eta) : eta;
  if (isNaN(num) || num <= 0) return '—';
  if (num < 60) return `${Math.round(num)}s`;
  if (num < 3600) return `${Math.round(num / 60)}m`;
  return `${Math.round(num / 3600)}h`;
}

/**
 * Format date to relative time (e.g. "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;

  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;
  return new Date(date).toLocaleDateString();
}
