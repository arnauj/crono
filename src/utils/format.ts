export function formatTime(totalSeconds: number): string {
  const mins = Math.floor(Math.abs(totalSeconds) / 60);
  const secs = Math.abs(totalSeconds) % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Like formatTime but appends hundredths of a second (MM:SS.cc). Accepts a
 * fractional seconds value so the centiseconds reflect sub-second progress.
 */
export function formatTimeCs(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds);
  const mins = Math.floor(abs / 60);
  const secs = Math.floor(abs % 60);
  const cs = Math.floor((abs * 100) % 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export function formatTimeHMS(date: Date): string {
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
