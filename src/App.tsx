import { useCallback, useEffect, useSyncExternalStore, useState } from 'react';
import type { TimerMode } from './types/timer';
import { MainMenu } from './components/MainMenu';
import { ClockMode } from './components/ClockMode';
import { TabataMode } from './components/TabataMode';
import { ForTimeMode } from './components/ForTimeMode';
import { EmomMode } from './components/EmomMode';
import { AmrapMode } from './components/AmrapMode';
import { PersonalizedMode } from './components/PersonalizedMode';
import { SettingsPanel } from './components/SettingsPanel';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const validModes: TimerMode[] = ['clock', 'tabata', 'fortime', 'emom', 'amrap', 'personalized'];

function modeFromPath(): TimerMode | null {
  const path = window.location.pathname.replace(BASE, '').replace(/^\//, '').replace(/\/$/, '');
  return validModes.includes(path as TimerMode) ? (path as TimerMode) : null;
}

const subscribeFullscreen = (cb: () => void) => {
  document.addEventListener('fullscreenchange', cb);
  return () => document.removeEventListener('fullscreenchange', cb);
};
const getFullscreen = () => !!document.fullscreenElement;

function App() {
  const [mode, setMode] = useState<TimerMode | null>(modeFromPath);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isFullscreen = useSyncExternalStore(subscribeFullscreen, getFullscreen);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const navigate = useCallback((m: TimerMode | null) => {
    const path = m ? `${BASE}/${m}` : `${BASE}/`;
    window.history.pushState(null, '', path);
    setMode(m);
  }, []);

  const goBack = useCallback(() => navigate(null), [navigate]);

  // Handle browser back/forward
  useEffect(() => {
    const onPopState = () => setMode(modeFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode) {
          navigate(null);
        } else if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  // Prevent screen sleep via wake lock. iOS releases the lock when the page is
  // hidden (screen off, tab switch) — re-acquire on visibilitychange so long
  // countdowns never leave the screen unattended.
  useEffect(() => {
    if (!mode) return;

    let wakeLock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (cancelled) return;
      if (!('wakeLock' in navigator)) return;
      if (document.visibilityState !== 'visible') return;
      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch {
        // ignore — lock not available
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      wakeLock?.release().catch(() => {});
    };
  }, [mode]);

  const content = (() => {
    if (!mode) return <MainMenu onSelectMode={navigate} />;
    switch (mode) {
      case 'clock': return <ClockMode onBack={goBack} />;
      case 'tabata': return <TabataMode onBack={goBack} />;
      case 'fortime': return <ForTimeMode onBack={goBack} />;
      case 'emom': return <EmomMode onBack={goBack} />;
      case 'amrap': return <AmrapMode onBack={goBack} />;
      case 'personalized': return <PersonalizedMode onBack={goBack} />;
    }
  })();

  return (
    <>
      {content}
      <div className="fixed top-6 right-6 z-40 flex gap-3 md:top-8 md:right-10">
        <button
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="
            hidden md:flex items-center justify-center w-12 h-12 rounded-2xl
            bg-white/[0.06] border border-white/[0.08]
            text-gray-300
            hover:bg-white/[0.12] hover:text-white hover:border-white/[0.15]
            active:scale-95 transition-all duration-200
            backdrop-blur-sm
          "
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isFullscreen
              ? <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/>
              : <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
            }
          </svg>
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          className="
            flex items-center justify-center w-12 h-12 rounded-2xl
            bg-white/[0.06] border border-white/[0.08]
            text-gray-300
            hover:bg-white/[0.12] hover:text-white hover:border-white/[0.15]
            active:scale-95 transition-all duration-200
            backdrop-blur-sm
          "
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z"/>
          </svg>
        </button>
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

export default App;
