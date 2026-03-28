import { useState } from 'react';
import { loadSetting, saveSetting } from '../utils/storage';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [countdown, setCountdown] = useState(() => loadSetting('countdown-seconds', 10));
  const [soundOn, setSoundOn] = useState(() => loadSetting('sound-enabled', true));

  if (!open) return null;

  const updateCountdown = (v: number) => {
    const clamped = Math.max(3, Math.min(30, v));
    setCountdown(clamped);
    saveSetting('countdown-seconds', clamped);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    saveSetting('sound-enabled', next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl bg-[#141414] border border-white/[0.08] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <h3 className="text-white text-lg font-bold tracking-tight">Settings</h3>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.08] active:scale-90 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Settings */}
        <div className="px-6 py-5 flex flex-col gap-5">

          {/* Countdown */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-base font-semibold">Countdown</p>
              <p className="text-gray-500 text-sm">Before each start</p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => updateCountdown(countdown - 1)}
                disabled={countdown <= 3}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.06] text-gray-300 text-lg hover:bg-white/[0.12] hover:text-white active:scale-90 disabled:opacity-20 transition-all"
              >&minus;</button>
              <span className="w-10 text-center text-white text-lg font-bold tabular-nums">{countdown}s</span>
              <button
                onClick={() => updateCountdown(countdown + 1)}
                disabled={countdown >= 30}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.06] text-gray-300 text-lg hover:bg-white/[0.12] hover:text-white active:scale-90 disabled:opacity-20 transition-all"
              >+</button>
            </div>
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-base font-semibold">Sound</p>
              <p className="text-gray-500 text-sm">Beeps and alerts</p>
            </div>
            <button
              onClick={toggleSound}
              className={`
                relative w-14 h-8 rounded-full transition-colors duration-200
                ${soundOn ? 'bg-cyan-500' : 'bg-white/[0.1]'}
              `}
              aria-label={soundOn ? 'Disable sound' : 'Enable sound'}
            >
              <span className={`
                absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200
                ${soundOn ? 'translate-x-6' : 'translate-x-0'}
              `} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
