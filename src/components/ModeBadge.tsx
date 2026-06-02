import type { TimerMode } from '../types/timer';
import { useT } from '../hooks/useI18n';
import { modeStyles, modeLabelKey } from '../utils/modes';

export function ModeBadge({ mode }: { mode: TimerMode }) {
  const t = useT();
  const s = modeStyles[mode];
  return (
    <span className={`${s.bg} ${s.text} text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0`}>
      {t(modeLabelKey[mode])}
    </span>
  );
}
