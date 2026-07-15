import type { TimerMode } from '../types/timer';

/* Per-mode accent colors, shared by the library and the loaded-WOD panel. */
export const modeStyles: Record<TimerMode, { bg: string; text: string }> = {
  clock:        { bg: 'bg-blue-500/20 border border-blue-300/30 backdrop-blur-md',    text: 'text-blue-200' },
  tabata:       { bg: 'bg-orange-500/20 border border-orange-300/30 backdrop-blur-md',  text: 'text-orange-200' },
  fortime:      { bg: 'bg-emerald-500/20 border border-emerald-300/30 backdrop-blur-md', text: 'text-emerald-200' },
  emom:         { bg: 'bg-purple-500/20 border border-purple-300/30 backdrop-blur-md',  text: 'text-purple-200' },
  amrap:        { bg: 'bg-rose-500/20 border border-rose-300/30 backdrop-blur-md',    text: 'text-rose-200' },
  personalized: { bg: 'bg-cyan-500/20 border border-cyan-300/30 backdrop-blur-md',    text: 'text-cyan-200' },
};

export const modeLabelKey: Record<TimerMode, string> = {
  clock: 'mode.clock', tabata: 'mode.tabata', fortime: 'mode.fortime',
  emom: 'mode.emom', amrap: 'mode.amrap', personalized: 'mode.custom',
};
