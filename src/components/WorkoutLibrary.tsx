import { useMemo, useState } from 'react';
import type { TimerMode } from '../types/timer';
import { WODS, type Wod, type WodCategory } from '../data/wods';
import { loadFavorites, removeFavorite, updateFavorite, type Favorite } from '../utils/favorites';
import { useT } from '../hooks/useI18n';
import { t as tRaw } from '../utils/i18n';
import { ModeBadge } from './ModeBadge';
import { modeLabelKey } from '../utils/modes';
import type { LoadedWod } from './WodInfoPanel';

interface WorkoutLibraryProps {
  open: boolean;
  onClose: () => void;
  onLoad: (mode: TimerMode, settings: Record<string, unknown>, info: LoadedWod) => void;
}

type Tab = WodCategory | 'favorites';

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

/* Short config summary for a saved favorite, derived from its stored settings. */
function favoriteSummary(fav: Favorite, t: typeof tRaw): string {
  const s = fav.settings as Record<string, number>;
  switch (fav.mode) {
    case 'amrap': return `AMRAP ${fmtTime(s['amrap-seconds'] ?? 0)}`;
    case 'fortime': return `${t('label.timeCap')} ${fmtTime(s['fortime-seconds'] ?? 0)}`;
    case 'emom': {
      const interval = (s['emom-min'] ?? 0) * 60 + (s['emom-sec'] ?? 0);
      const rest = (s['emom-rest'] ?? 0) > 0 ? ` + ${fmtTime(s['emom-rest'])} ${t('label.rest').toLowerCase()}` : '';
      return `EMOM ${s['emom-rounds'] ?? 0} × ${fmtTime(interval)}${rest}`;
    }
    case 'tabata':
      return `Tabata ${s['tabata-rounds'] ?? 0} × ${s['tabata-work'] ?? 0}/${s['tabata-rest'] ?? 0}${t('suffix.sec')}`;
    case 'personalized': return t('mode.custom');
    default: return t(modeLabelKey[fav.mode]);
  }
}

function LoadButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="
        shrink-0 flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-xl
        bg-green-500/15 text-green-300 border border-green-500/25
        text-xs font-bold uppercase tracking-wider
        hover:bg-green-500/25 hover:text-green-200 active:scale-95 transition-all
      "
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      {label}
    </button>
  );
}

export function WorkoutLibrary({ open, onClose, onLoad }: WorkoutLibraryProps) {
  const t = useT();
  const [tab, setTab] = useState<Tab>('girl');
  const [favorites, setFavorites] = useState<Favorite[]>(loadFavorites);
  // The favorite currently being edited (name + description), if any.
  const [editing, setEditing] = useState<Favorite | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Refresh the favorites list each time the library transitions to open
  // (adjusting state during render is React's recommended pattern for this).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setFavorites(loadFavorites());
  }

  const girls = useMemo(() => WODS.filter((w) => w.category === 'girl'), []);
  const heroes = useMemo(() => WODS.filter((w) => w.category === 'hero'), []);

  if (!open) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'girl', label: t('library.girls') },
    { id: 'hero', label: t('library.heroes') },
    { id: 'favorites', label: t('library.favorites') },
  ];

  const deleteFav = (id: string) => setFavorites(removeFavorite(id));

  const openEdit = (f: Favorite) => {
    setEditing(f);
    setEditName(f.name);
    setEditDescription(f.description ?? '');
  };

  const saveEdit = () => {
    if (!editing) return;
    setFavorites(updateFavorite(editing.id, { name: editName, description: editDescription }));
    setEditing(null);
  };

  const renderWod = (w: Wod) => (
    <li key={w.id} className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <h4 className="text-white text-lg font-bold tracking-tight truncate">{w.name}</h4>
            <ModeBadge mode={w.mode} />
          </div>
          <p className="text-gray-300 text-sm font-semibold">{w.scheme}</p>
          <p className="text-gray-500 text-sm leading-snug mt-0.5">{w.movements}</p>
        </div>
        <LoadButton
          label={t('library.load')}
          onClick={() => onLoad(w.mode, w.settings, { name: w.name, mode: w.mode, scheme: w.scheme, movements: w.movements })}
        />
      </div>
    </li>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md mx-4 max-h-[85vh] flex flex-col rounded-2xl bg-[#141414] border border-white/[0.08] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <h3 className="flex items-center gap-2.5 text-white text-lg font-bold tracking-tight">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
              <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            {t('library.title')}
          </h3>
          <button
            onClick={onClose}
            aria-label={t('btn.back')}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.08] active:scale-90 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 px-4 pt-3 pb-2 shrink-0">
          {tabs.map((tb) => {
            const active = tab === tb.id;
            return (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={`
                  flex-1 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all
                  ${active
                    ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                    : 'text-gray-500 border border-transparent hover:text-gray-300 hover:bg-white/[0.04]'
                  }
                `}
              >
                {tb.label}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="px-4 pb-4 pt-1 overflow-y-auto">
          {tab === 'favorites' ? (
            favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-14 px-6">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700 mb-3">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <p className="text-gray-500 text-sm">{t('library.empty')}</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {favorites.map((f) => (
                  <li key={f.id} className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <h4 className="text-white text-lg font-bold tracking-tight truncate">{f.name}</h4>
                          <ModeBadge mode={f.mode} />
                        </div>
                        <p className="text-gray-400 text-sm font-semibold">{favoriteSummary(f, t)}</p>
                        {f.description && (
                          <p className="text-gray-500 text-sm leading-snug mt-1 whitespace-pre-wrap break-words line-clamp-3">{f.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <LoadButton
                          label={t('library.load')}
                          onClick={() => onLoad(f.mode, f.settings, { name: f.name, mode: f.mode, scheme: favoriteSummary(f, t), description: f.description })}
                        />
                        <button
                          onClick={() => openEdit(f)}
                          aria-label={t('library.edit')}
                          title={t('library.edit')}
                          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-amber-300 hover:bg-amber-400/10 active:scale-90 transition-all"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                        </button>
                        <button
                          onClick={() => deleteFav(f.id)}
                          aria-label={t('library.delete')}
                          title={t('library.delete')}
                          className="w-9 h-9 flex items-center justify-center rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <ul className="flex flex-col gap-2.5">
              {(tab === 'girl' ? girls : heroes).map(renderWod)}
            </ul>
          )}
        </div>
      </div>

      {/* Edit dialog for a saved workout (name + description). */}
      {editing && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); setEditing(null); }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm mx-4 rounded-2xl bg-[#141414] border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
              <h3 className="text-white text-lg font-bold tracking-tight">{t('favorite.editTitle')}</h3>
              <button
                onClick={() => setEditing(null)}
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
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); }}
                  placeholder={t('favorite.placeholder')}
                  maxLength={40}
                  className="
                    w-full h-12 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08]
                    text-white text-base font-semibold
                    focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40
                  "
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-gray-400 text-sm font-medium">{t('favorite.description')}</span>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t('favorite.descriptionPlaceholder')}
                  rows={3}
                  maxLength={500}
                  className="
                    w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]
                    text-white text-base font-medium resize-none
                    focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40
                  "
                />
              </label>
              <button
                onClick={saveEdit}
                className="
                  w-full h-12 flex items-center justify-center gap-2 rounded-xl
                  bg-gradient-to-b from-amber-400 to-amber-500 text-black
                  font-bold uppercase tracking-wider
                  hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] transition-all
                "
              >
                {t('favorite.update')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
