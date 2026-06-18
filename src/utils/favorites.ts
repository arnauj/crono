import type { TimerMode } from '../types/timer';
import { loadSetting, saveSetting } from './storage';

/**
 * A user-saved workout. Mirrors the loadable shape of a benchmark WOD: a target
 * timer mode plus the exact settings that mode reads on mount. Settings are
 * stored as `unknown` because custom (Personalized) mode persists arrays, while
 * the simple modes persist plain numbers.
 */
export interface Favorite {
  id: string;
  name: string;
  /** Optional free-text notes (movements, reps…) shown while training. */
  description?: string;
  mode: TimerMode;
  settings: Record<string, unknown>;
  createdAt: number;
}

const KEY = 'favorites';

export function loadFavorites(): Favorite[] {
  const list = loadSetting<Favorite[]>(KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveFavorite(name: string, mode: TimerMode, settings: Record<string, unknown>, description = ''): Favorite {
  const fav: Favorite = {
    id: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || 'WOD',
    description: description.trim() || undefined,
    mode,
    settings,
    createdAt: Date.now(),
  };
  // Newest first.
  saveFavorites([fav, ...loadFavorites()]);
  return fav;
}

export function removeFavorite(id: string): Favorite[] {
  const next = loadFavorites().filter((f) => f.id !== id);
  saveFavorites(next);
  return next;
}

function saveFavorites(list: Favorite[]): void {
  saveSetting(KEY, list);
}
