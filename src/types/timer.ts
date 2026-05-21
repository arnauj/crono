export type TimerMode = 'clock' | 'tabata' | 'fortime' | 'emom' | 'amrap' | 'personalized';

export type TimerPhase = 'idle' | 'countdown' | 'work' | 'rest' | 'done';

export interface TimerState {
  phase: TimerPhase;
  timeLeft: number; // seconds remaining in current phase
  currentRound: number;
  totalRounds: number;
  elapsed: number; // total elapsed seconds (for ForTime)
  isRunning: boolean;
  segmentIndex?: number;
}

export interface TabataConfig {
  rounds: number;
  workSeconds: number;
  restSeconds: number;
}

export interface ForTimeConfig {
  seconds: number;
}

export interface EmomConfig {
  intervalSeconds: number;
  rounds: number;
  restSeconds: number;
}

export interface AmrapConfig {
  seconds: number;
}

export interface RestConfig {
  seconds: number;
}

export type BlockType = 'emom' | 'fortime' | 'tabata' | 'amrap' | 'rest';

export interface TrainingBlock {
  id: string;
  type: BlockType;
  name: string;
  config: TabataConfig | ForTimeConfig | EmomConfig | AmrapConfig | RestConfig;
}
