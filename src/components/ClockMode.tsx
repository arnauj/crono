import { useEffect, useState } from 'react';
import { TimerLayout } from './TimerLayout';
import { formatTimeHMS } from '../utils/format';
import { useT } from '../hooks/useI18n';

interface ClockModeProps {
  onBack: () => void;
}

export function ClockMode({ onBack }: ClockModeProps) {
  const t = useT();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <TimerLayout title={t('mode.clock')} phase="idle" onBack={onBack}>
      <div className="flex-1 flex items-center justify-center">
        <time
          className="timer-digits timer-glow text-white"
          style={{ fontSize: 'clamp(4rem, 20vw, 16rem)', lineHeight: 0.9 }}
          aria-live="polite"
          aria-label={`${t('clock.currentTime')}: ${formatTimeHMS(time)}`}
        >
          {formatTimeHMS(time)}
        </time>
      </div>
    </TimerLayout>
  );
}
