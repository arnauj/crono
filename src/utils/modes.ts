import type { TimerMode } from '../types/timer';

/* Per-mode accent colors, shared by the library and the loaded-WOD panel. */
export const modeStyles: Record<TimerMode, { bg: string; text: string }> = {
  clock:        { bg: 'bg-blue-500/15',    text: 'text-blue-300' },
  tabata:       { bg: 'bg-orange-500/15',  text: 'text-orange-300' },
  fortime:      { bg: 'bg-emerald-500/15', text: 'text-emerald-300' },
  emom:         { bg: 'bg-purple-500/15',  text: 'text-purple-300' },
  amrap:        { bg: 'bg-rose-500/15',    text: 'text-rose-300' },
  personalized: { bg: 'bg-cyan-500/15',    text: 'text-cyan-300' },
};

export const modeLabelKey: Record<TimerMode, string> = {
  clock: 'mode.clock', tabata: 'mode.tabata', fortime: 'mode.fortime',
  emom: 'mode.emom', amrap: 'mode.amrap', personalized: 'mode.custom',
};
