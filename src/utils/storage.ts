export function loadSetting<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(`crono-${key}`);
    if (stored !== null) {
      return JSON.parse(stored) as T;
    }
  } catch {
    // ignore
  }
  return defaultValue;
}

export function saveSetting<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`crono-${key}`, JSON.stringify(value));
  } catch {
    // ignore
  }
}
