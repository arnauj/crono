import { useState } from 'react';
import type { TimerMode } from '../types/timer';
import { ModeBadge } from './ModeBadge';
import { useT } from '../hooks/useI18n';

/* The subset of a loaded WOD/favorite worth surfacing while you train. */
export interface LoadedWod {
  name: string;
  mode: TimerMode;
  scheme?: string;
  movements?: string;
}

/**
 * A non-intrusive, desktop-only card that recalls which workout you loaded from
 * the library. It lives in the bottom-left corner — clear of the back button
 * (top-left) and the toolbar (top-right) — and collapses to a small badge so it
 * never competes with the running timer. Hidden entirely on small screens,
 * where there's no room to spare.
 */
export function WodInfoPanel({ info }: { info: LoadedWod | null }) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);

  // Re-expand whenever a different workout is loaded, so the fresh details are
  // shown without the user having to re-open the panel.
  const [prevName, setPrevName] = useState(info?.name);
  if (info?.name !== prevName) {
    setPrevName(info?.name);
    setCollapsed(false);
  }

  if (!info) return null;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        aria-label={t('wod.show')}
        title={`${t('wod.show')} · ${info.name}`}
        className="
          hidden md:flex fixed bottom-6 left-6 z-30 items-center justify-center
          w-16 h-16 rounded-2xl
          bg-white/[0.06] border border-white/[0.08]
          text-amber-300
          hover:bg-white/[0.12] hover:text-amber-200 hover:border-white/[0.15]
          active:scale-95 transition-all duration-200
          backdrop-blur-sm wod-panel-in
        "
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="3" width="8" height="4" rx="1" />
          <path d="M9 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2h-2" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      </button>
    );
  }

  // Movements are stored as a single string with parts separated by "·"; show
  // each part on its own bulleted line so a multi-movement WOD reads as a list.
  const movements = info.movements
    ? info.movements.split('·').map((m) => m.trim()).filter(Boolean)
    : [];

  return (
    <div className="hidden md:block fixed bottom-6 left-6 z-30 w-[26rem] max-w-[calc(100vw-3rem)] wod-panel-in">
      <div className="rounded-3xl bg-[#141414]/85 border border-white/[0.08] shadow-2xl backdrop-blur-md p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <ModeBadge mode={info.mode} />
            <h3 className="text-white text-3xl font-bold tracking-tight truncate mt-3">{info.name}</h3>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            aria-label={t('wod.hide')}
            title={t('wod.hide')}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.08] active:scale-90 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
          </button>
        </div>
        {info.scheme && <p className="text-gray-300 text-lg font-semibold mt-3">{info.scheme}</p>}
        {movements.length > 0 && (
          <ul className="mt-2 space-y-1">
            {movements.map((m, i) => (
              <li key={i} className="flex gap-2 text-gray-400 text-base leading-snug">
                <span className="text-amber-400/70 shrink-0">–</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
