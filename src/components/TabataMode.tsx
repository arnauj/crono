import { useMemo, useState } from 'react';
import { TimerLayout } from './TimerLayout';
import { TimerDisplay } from './TimerDisplay';
import { Controls } from './Controls';
import { NumberInput } from './NumberInput';
import { DurationInput } from './DurationInput';
import { FavoriteButton } from './FavoriteButton';
import { useTimer, buildTabataSegments } from '../hooks/useTimer';
import { loadSetting, saveSetting } from '../utils/storage';
import { useT } from '../hooks/useI18n';
import { useCameraWorkout } from '../recording/context';

interface TabataModeProps { onBack: () => void; }

export function TabataMode({ onBack }: TabataModeProps) {
  const t = useT();
  const [rounds, setRounds] = useState(() => loadSetting('tabata-rounds', 8));
  const [workSec, setWorkSec] = useState(() => loadSetting('tabata-work', 20));
  const [restSec, setRestSec] = useState(() => loadSetting('tabata-rest', 10));

  const segments = useMemo(() => buildTabataSegments(rounds, workSec, restSec), [rounds, workSec, restSec]);
  const { state, start, pause, reset } = useTimer({ segments });

  const handleStart = () => {
    saveSetting('tabata-rounds', rounds);
    saveSetting('tabata-work', workSec);
    saveSetting('tabata-rest', restSec);
    start();
  };
  const handleBack = () => { reset(); onBack(); };
  useCameraWorkout({ phase: state.phase, start: handleStart, reset });

  const subtitle = state.phase === 'work' || state.phase === 'rest'
    ? t('sub.roundOf', { current: state.currentRound, total: state.totalRounds })
    : state.phase === 'done'
    ? t('sub.roundsCompleted', { total: state.totalRounds }) : undefined;

  return (
    <TimerLayout title={t('mode.tabata')} subtitle={subtitle} phase={state.phase} onBack={handleBack}>
      {state.phase === 'idle' ? (
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-full flex flex-col gap-5">
            <NumberInput label={t('label.rounds')} value={rounds} onChange={setRounds} min={1} suffix={t('suffix.rounds')} />
            <DurationInput label={t('label.work')} seconds={workSec} onChange={setWorkSec} min={1} />
            <DurationInput label={t('label.rest')} seconds={restSec} onChange={setRestSec} min={0} />
            <Controls isRunning={false} isStarted={false} isDone={false} onStart={handleStart} onPause={() => {}} onReset={() => {}} />
            <FavoriteButton mode="tabata" defaultName={t('mode.tabata')} getSettings={() => ({
              'tabata-rounds': rounds,
              'tabata-work': workSec,
              'tabata-rest': restSec,
            })} />
          </div>
        </div>
      ) : (
        <>
          <TimerDisplay time={state.timeLeft} phase={state.phase} currentRound={state.currentRound} totalRounds={state.totalRounds} onClick={state.phase !== 'done' ? pause : undefined} typeLabel={t('mode.tabata')} elapsed={state.elapsed} />
          <Controls isRunning={state.isRunning} isStarted isDone={state.phase === 'done'} onStart={handleStart} onPause={pause} onReset={reset} />
        </>
      )}
    </TimerLayout>
  );
}
