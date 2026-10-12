export function formatTabInactivityDuration(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    return 'Not recorded';
  }
  if (seconds > 0 && seconds < 1) return '<1s';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours ? `${hours}h ` : ''}${minutes ? `${minutes}m ` : ''}${total % 60}s`;
}
