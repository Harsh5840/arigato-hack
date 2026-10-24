export function durationLabel(milliseconds: number | null | undefined) {
  if (milliseconds === null || milliseconds === undefined) return '—';
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}
export const numberLabel = (value: number) => new Intl.NumberFormat('en-GB').format(value);
export function japanTime(value: string, date = false) {
  return new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Tokyo', ...(date ? {day: '2-digit', month: 'short'} : {}), hour: '2-digit', minute: '2-digit', ...(date ? {} : {second: '2-digit'}), hour12: false}).format(new Date(value));
}
