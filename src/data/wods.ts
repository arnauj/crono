import type { TimerMode } from '../types/timer';

export type WodCategory = 'girl' | 'hero';

/**
 * A famous CrossFit benchmark workout (the "Girls" and "Hero" WODs).
 *
 * Each one maps to one of the app's timer modes and carries the exact
 * localStorage settings that mode reads on mount, so "loading" a WOD is just a
 * matter of writing those keys and navigating to the mode.
 *
 * Movement names are kept in standard (English) CrossFit terminology — that's
 * how they're universally referred to in every box, regardless of UI language.
 */
export interface Wod {
  id: string;
  name: string;
  category: WodCategory;
  mode: TimerMode;
  scheme: string;     // short rep/round scheme, e.g. "21-15-9" or "AMRAP 20"
  movements: string;  // the actual movements
  settings: Record<string, number>;
}

const amrap = (seconds: number) => ({ 'amrap-seconds': seconds });
const fortime = (seconds: number) => ({ 'fortime-seconds': seconds });
const emom = (intervalSec: number, rounds: number, restSec = 0) => ({
  'emom-min': Math.floor(intervalSec / 60),
  'emom-sec': intervalSec % 60,
  'emom-rounds': rounds,
  'emom-rest': restSec,
});

export const WODS: Wod[] = [
  /* ─────────────── The Girls ─────────────── */
  {
    id: 'fran', name: 'Fran', category: 'girl', mode: 'fortime',
    scheme: '21-15-9', movements: 'Thrusters (43 kg) · Pull-ups',
    settings: fortime(8 * 60),
  },
  {
    id: 'cindy', name: 'Cindy', category: 'girl', mode: 'amrap',
    scheme: 'AMRAP 20', movements: '5 Pull-ups · 10 Push-ups · 15 Air Squats',
    settings: amrap(20 * 60),
  },
  {
    id: 'annie', name: 'Annie', category: 'girl', mode: 'fortime',
    scheme: '50-40-30-20-10', movements: 'Double-unders · Sit-ups',
    settings: fortime(10 * 60),
  },
  {
    id: 'grace', name: 'Grace', category: 'girl', mode: 'fortime',
    scheme: 'For Time', movements: '30 Clean & Jerks (61 kg)',
    settings: fortime(8 * 60),
  },
  {
    id: 'isabel', name: 'Isabel', category: 'girl', mode: 'fortime',
    scheme: 'For Time', movements: '30 Snatches (61 kg)',
    settings: fortime(8 * 60),
  },
  {
    id: 'diane', name: 'Diane', category: 'girl', mode: 'fortime',
    scheme: '21-15-9', movements: 'Deadlifts (102 kg) · Handstand Push-ups',
    settings: fortime(10 * 60),
  },
  {
    id: 'elizabeth', name: 'Elizabeth', category: 'girl', mode: 'fortime',
    scheme: '21-15-9', movements: 'Cleans (61 kg) · Ring Dips',
    settings: fortime(10 * 60),
  },
  {
    id: 'helen', name: 'Helen', category: 'girl', mode: 'fortime',
    scheme: '3 Rounds', movements: '400 m Run · 21 KB Swings (24 kg) · 12 Pull-ups',
    settings: fortime(12 * 60),
  },
  {
    id: 'karen', name: 'Karen', category: 'girl', mode: 'fortime',
    scheme: 'For Time', movements: '150 Wall Balls (9 kg)',
    settings: fortime(10 * 60),
  },
  {
    id: 'chelsea', name: 'Chelsea', category: 'girl', mode: 'emom',
    scheme: 'EMOM 30', movements: '5 Pull-ups · 10 Push-ups · 15 Air Squats',
    settings: emom(60, 30),
  },
  {
    id: 'mary', name: 'Mary', category: 'girl', mode: 'amrap',
    scheme: 'AMRAP 20', movements: '5 Handstand Push-ups · 10 Pistols · 15 Pull-ups',
    settings: amrap(20 * 60),
  },
  {
    id: 'nancy', name: 'Nancy', category: 'girl', mode: 'fortime',
    scheme: '5 Rounds', movements: '400 m Run · 15 Overhead Squats (43 kg)',
    settings: fortime(20 * 60),
  },
  {
    id: 'angie', name: 'Angie', category: 'girl', mode: 'fortime',
    scheme: 'For Time', movements: '100 Pull-ups · 100 Push-ups · 100 Sit-ups · 100 Squats',
    settings: fortime(20 * 60),
  },
  {
    id: 'barbara', name: 'Barbara', category: 'girl', mode: 'fortime',
    scheme: '5 Rounds', movements: '20 Pull-ups · 30 Push-ups · 40 Sit-ups · 50 Squats',
    settings: fortime(25 * 60),
  },

  /* ─────────────── The Heroes ─────────────── */
  {
    id: 'murph', name: 'Murph', category: 'hero', mode: 'fortime',
    scheme: 'For Time', movements: '1 mi Run · 100 Pull-ups · 200 Push-ups · 300 Squats · 1 mi Run',
    settings: fortime(50 * 60),
  },
  {
    id: 'dt', name: 'DT', category: 'hero', mode: 'fortime',
    scheme: '5 Rounds', movements: '12 Deadlifts · 9 Hang Power Cleans · 6 Push Jerks (70 kg)',
    settings: fortime(15 * 60),
  },
  {
    id: 'jt', name: 'JT', category: 'hero', mode: 'fortime',
    scheme: '21-15-9', movements: 'Handstand Push-ups · Ring Dips · Push-ups',
    settings: fortime(12 * 60),
  },
  {
    id: 'michael', name: 'Michael', category: 'hero', mode: 'fortime',
    scheme: '3 Rounds', movements: '800 m Run · 50 Back Extensions · 50 Sit-ups',
    settings: fortime(25 * 60),
  },
  {
    id: 'kalsu', name: 'Kalsu', category: 'hero', mode: 'fortime',
    scheme: 'For Time', movements: '100 Thrusters (61 kg) · 5 Burpees EMOM',
    settings: fortime(26 * 60),
  },
  {
    id: 'randy', name: 'Randy', category: 'hero', mode: 'fortime',
    scheme: 'For Time', movements: '75 Power Snatches (34 kg)',
    settings: fortime(8 * 60),
  },
  {
    id: 'nate', name: 'Nate', category: 'hero', mode: 'amrap',
    scheme: 'AMRAP 20', movements: '2 Muscle-ups · 4 HSPU · 8 KB Swings (32 kg)',
    settings: amrap(20 * 60),
  },
  {
    id: 'glen', name: 'Glen', category: 'hero', mode: 'fortime',
    scheme: 'For Time', movements: '30 Clean & Jerks · 1 mi Run · 10 Rope Climbs · 1 mi Run · 100 Burpees',
    settings: fortime(40 * 60),
  },
];
