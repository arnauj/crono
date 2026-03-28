import { useMemo, useState } from 'react';
import { TimerLayout } from './TimerLayout';
import { TimerDisplay } from './TimerDisplay';
import { Controls } from './Controls';
import { NumberInput } from './NumberInput';
import { useTimer, buildEmomSegments } from '../hooks/useTimer';
import { loadSetting, saveSetting } from '../utils/storage';
import { useT } from '../hooks/useI18n';

interface EmomModeProps { onBack: () => void; }

export function EmomMode({ onBack }: EmomModeProps) {
  const t = useT();
  const [intervalMin, setIntervalMin] = useState(() => loadSetting('emom-min', 1));
  const [intervalSec, setIntervalSec] = useState(() => loadSetting('emom-sec', 0));
  const [rounds, setRounds] = useState(() => loadSetting('emom-rounds', 10));
  const [restSec, setRestSec] = useState(() => loadSetting('emom-rest', 0));

  const segments = useMemo(() => buildEmomSegments(intervalMin, intervalSec, rounds, restSec), [intervalMin, intervalSec, rounds, restSec]);
  const { state, start, pause, reset } = useTimer({ segments });

  const handleStart = () => {
    if (intervalMin === 0 && intervalSec === 0) return;
    saveSetting('emom-min', intervalMin);
    saveSetting('emom-sec', intervalSec);
    saveSetting('emom-rounds', rounds);
    saveSetting('emom-rest', restSec);
    start();
  };
  const handleBack = () => { reset(); onBack(); };

  const subtitle = state.phase === 'work' || state.phase === 'rest'
    ? t('sub.roundOf', { current: state.currentRound, total: state.totalRounds })
    : state.phase === 'done'
    ? t('sub.roundsCompleted', { total: state.totalRounds }) : undefined;

  return (
    <TimerLayout title={t('mode.emom')} subtitle={subtitle} phase={state.phase} onBack={handleBack}>
      {state.phase === 'idle' ? (
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-full flex flex-col gap-5">
            <NumberInput label={t('label.every')} value={intervalMin} onChange={setIntervalMin} min={0} suffix={t('suffix.minutes')} />
            <NumberInput label={t('label.and')} value={intervalSec} onChange={setIntervalSec} min={0} max={59} suffix={t('suffix.seconds')} />
            <NumberInput label={t('label.for')} value={rounds} onChange={setRounds} min={1} suffix={t('suffix.rounds')} />
            <NumberInput label={t('label.rest')} value={restSec} onChange={setRestSec} min={0} suffix={t('suffix.seconds')} />
            <Controls isRunning={false} isStarted={false} isDone={false} onStart={handleStart} onPause={() => {}} onReset={() => {}} />
          </div>
        </div>
      ) : (
        <>
          <TimerDisplay time={state.timeLeft} phase={state.phase} currentRound={state.currentRound} totalRounds={state.totalRounds} onClick={state.phase !== 'done' ? pause : undefined} />
          <Controls isRunning={state.isRunning} isStarted isDone={state.phase === 'done'} onStart={handleStart} onPause={pause} onReset={reset} />
        </>
      )}
    </TimerLayout>
  );
}
