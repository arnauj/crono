import { useState } from 'react';
import type { TimerMode } from '../types/timer';
import { saveFavorite } from '../utils/favorites';
import { useT } from '../hooks/useI18n';

interface FavoriteButtonProps {
  mode: TimerMode;
  /** Snapshot of the current config as localStorage key/value pairs. */
  getSettings: () => Record<string, unknown>;
  /** Suggested default name (e.g. the mode label). */
  defaultName?: string;
}

/**
 * A star button shown on a mode's setup screen. Tapping it opens a small dialog
 * that asks for a name and saves the current configuration as a favorite,
 * which then appears in the workout library.
 */
export function FavoriteButton({ mode, getSettings, defaultName = '' }: FavoriteButtonProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [saved, setSaved] = useState(false);

  const openDialog = () => {
    setName(defaultName);
    setSaved(false);
    setOpen(true);
  };

  const submit = () => {
    saveFavorite(name, mode, getSettings());
    setSaved(true);
    window.setTimeout(() => setOpen(false), 850);
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label={t('favorite.title')}
        title={t('favorite.title')}
        className="
          shrink-0 w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-2xl
          bg-white/[0.04] border border-white/[0.08]
          text-gray-400 text-sm font-semibold uppercase tracking-wider
          hover:bg-amber-400/10 hover:border-amber-400/30 hover:text-amber-300
          active:scale-[0.98] transition-all
        "
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        {t('favorite.save')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm mx-4 rounded-2xl bg-[#141414] border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
              <h3 className="flex items-center gap-2 text-white text-lg font-bold tracking-tight">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {t('favorite.title')}
              </h3>
              <button
                onClick={() => setOpen(false)}
                aria-label={t('favorite.cancel')}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.08] active:scale-90 transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-gray-400 text-sm font-medium">{t('favorite.name')}</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                  placeholder={t('favorite.placeholder')}
                  maxLength={40}
                  className="
                    w-full h-12 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08]
                    text-white text-base font-semibold
                    focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40
                  "
                />
              </label>
              <button
                onClick={submit}
                disabled={saved}
                className="
                  w-full h-12 flex items-center justify-center gap-2 rounded-xl
                  bg-gradient-to-b from-amber-400 to-amber-500 text-black
                  font-bold uppercase tracking-wider
                  hover:from-amber-300 hover:to-amber-400 active:scale-[0.98]
                  disabled:opacity-100 transition-all
                "
              >
                {saved ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    {t('favorite.saved')}
                  </>
                ) : (
                  t('favorite.save')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
