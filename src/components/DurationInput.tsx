import { useState } from 'react';
import { useT } from '../hooks/useI18n';
import { formatDurationBreakdown } from '../utils/format';

type Unit = 'min' | 'sec';

const MAX_SECONDS = 5999; // 99:59

interface DurationInputProps {
  label: string;
  /** Source of truth: total duration in seconds. */
  seconds: number;
  onChange: (seconds: number) => void;
  /** Minimum total seconds. */
  min?: number;
  /** Compact layout for inline rows (e.g. custom block cards). */
  compact?: boolean;
}

function initialUnit(seconds: number): Unit {
  return seconds >= 60 && seconds % 60 === 0 ? 'min' : 'sec';
}

export function DurationInput({ label, seconds, onChange, min = 0, compact = false }: DurationInputProps) {
  const t = useT();
  const [unit, setUnit] = useState<Unit>(() => initialUnit(seconds));
  // While the user is typing we show their raw text (so the box can be
  // emptied); the clamped value is committed on every valid keystroke.
  const [draft, setDraft] = useState<string | null>(null);

  const step = unit === 'min' ? 60 : 1;
  const display = unit === 'min' ? Math.round(seconds / 60) : seconds;

  const commit = (s: number) => onChange(Math.max(min, Math.min(MAX_SECONDS, Math.round(s))));

  const handleInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits === '') {
      setDraft('');
      return;
    }
    const v = parseInt(digits, 10);
    setDraft(String(v)); // drops leading zeros: "010" -> "10"
    commit(v * step);
  };

  const handleBlur = () => {
    if (draft === '') commit(0);
    setDraft(null);
  };

  const toggleUnit = () => {
    setDraft(null);
    if (unit === 'sec') {
      // Snap to a whole minute so the minutes box always shows an exact integer.
      commit(Math.max(seconds > 0 ? 1 : 0, Math.round(seconds / 60)) * 60);
      setUnit('min');
    } else {
      setUnit('sec');
    }
  };

  const atMin = seconds <= min;
  const atMax = seconds >= MAX_SECONDS;

  // Small "1 h 30 m 1 s" breakdown, shown once the value spills past its unit
  // (>= 60 min, or >= 60 sec). Hidden while the box is emptied mid-edit.
  const showBreakdown =
    draft !== '' && (unit === 'min' ? seconds >= 3600 : seconds >= 60);
  const breakdown = showBreakdown ? formatDurationBreakdown(seconds) : null;

  const unitToggle = (
    <button
      type="button"
      onClick={toggleUnit}
      aria-label={`${label} unit: ${unit === 'min' ? t('suffix.minutes') : t('suffix.seconds')}. Tap to switch.`}
      className={
        compact
          ? 'flex items-center gap-1 h-11 px-2.5 rounded-lg bg-white/[0.06] text-[11px] font-bold uppercase tracking-wider hover:bg-white/[0.12] active:scale-90 transition-all'
          : 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.07] text-xs font-bold uppercase tracking-wider hover:bg-white/[0.12] active:scale-95 transition-all'
      }
    >
      <span className={unit === 'min' ? 'text-white' : 'text-gray-600'}>{t('suffix.min')}</span>
      <span className="text-gray-700">/</span>
      <span className={unit === 'sec' ? 'text-white' : 'text-gray-600'}>{t('suffix.sec')}</span>
    </button>
  );

  const inputValue = draft ?? String(display);

  if (compact) {
    return (
      <div className="py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-gray-400 text-base font-medium">{label}</span>
          <div className="flex items-center gap-2 shrink-0">
            {unitToggle}
            <button
              onClick={() => commit(seconds - step)}
              disabled={atMin}
              aria-label={`Decrease ${label}`}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/[0.06] text-gray-300 text-xl hover:bg-white/[0.12] hover:text-white active:scale-90 disabled:opacity-20 transition-all"
            >&minus;</button>
            <input
              type="text"
              inputMode="numeric"
              value={inputValue}
              onChange={(e) => handleInput(e.target.value)}
              onBlur={handleBlur}
              aria-label={`${label} value`}
              className="w-14 h-11 bg-white/[0.04] rounded-lg text-white text-center text-lg font-bold focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            <button
              onClick={() => commit(seconds + step)}
              disabled={atMax}
              aria-label={`Increase ${label}`}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/[0.06] text-gray-300 text-xl hover:bg-white/[0.12] hover:text-white active:scale-90 disabled:opacity-20 transition-all"
            >+</button>
          </div>
        </div>
        {breakdown && (
          <div className="mt-1 pr-13 text-right text-[11px] font-semibold tracking-wide text-gray-500">
            {breakdown}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <label className="text-gray-400 text-sm md:text-base font-medium uppercase tracking-widest">{label}</label>
        {unitToggle}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => commit(seconds - step)}
          disabled={atMin}
          aria-label={`Decrease ${label}`}
          className="
            shrink-0 w-16 h-16 md:w-18 md:h-18
            flex items-center justify-center rounded-xl
            bg-white/[0.07] text-white text-3xl
            hover:bg-white/[0.12]
            active:scale-90
            disabled:opacity-20 disabled:active:scale-100
            transition-all
          "
        >&minus;</button>

        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={(e) => handleInput(e.target.value)}
            onBlur={handleBlur}
            aria-label={`${label} value`}
            className={`
              w-full h-16 md:h-18
              rounded-xl bg-white/[0.05]
              text-white text-center text-4xl md:text-5xl font-bold
              border-none
              focus:outline-none focus:ring-2 focus:ring-white/20
              transition-all
              ${breakdown ? 'pb-4' : ''}
            `}
          />
          {breakdown && (
            <span className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[11px] font-semibold tracking-wide text-gray-500">
              {breakdown}
            </span>
          )}
        </div>

        <button
          onClick={() => commit(seconds + step)}
          disabled={atMax}
          aria-label={`Increase ${label}`}
          className="
            shrink-0 w-16 h-16 md:w-18 md:h-18
            flex items-center justify-center rounded-xl
            bg-white/[0.07] text-white text-3xl
            hover:bg-white/[0.12]
            active:scale-90
            disabled:opacity-20 disabled:active:scale-100
            transition-all
          "
        >+</button>
      </div>
    </div>
  );
}
