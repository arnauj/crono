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
import { WorkoutLibrary } from './components/WorkoutLibrary';
import { WodInfoPanel, type LoadedWod } from './components/WodInfoPanel';
import { saveSetting } from './utils/storage';
import { RecordingProvider } from './recording/RecordingProvider';
import { VideoRecordButton, CameraPreview, RecordingResultModal } from './recording/RecorderUI';
import { useT } from './hooks/useI18n';

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
  const t = useT();
  const [mode, setMode] = useState<TimerMode | null>(modeFromPath);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  // Details of the workout most recently loaded from the library, surfaced in a
  // dismissible side panel while training (desktop only). Cleared on going back.
  const [loadedWod, setLoadedWod] = useState<LoadedWod | null>(null);
  // Bumped each time a workout is loaded so the target mode remounts and re-reads
  // its freshly written settings — even when we're already in that mode.
  const [loadKey, setLoadKey] = useState(0);
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

  const goBack = useCallback(() => {
    setLoadedWod(null);
    navigate(null);
  }, [navigate]);

  // Load a benchmark WOD or saved favorite: persist its settings under the keys
  // the target mode reads, then navigate there (remounting via loadKey).
  const loadWorkout = useCallback((targetMode: TimerMode, settings: Record<string, unknown>, info: LoadedWod) => {
    for (const [key, value] of Object.entries(settings)) saveSetting(key, value);
    setLibraryOpen(false);
    setLoadedWod(info);
    setLoadKey((k) => k + 1);
    navigate(targetMode);
  }, [navigate]);

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
    // `loadKey` in the key forces a remount when a workout is loaded into the
    // mode we're already viewing, so it picks up the new settings.
    switch (mode) {
      case 'clock': return <ClockMode key={loadKey} onBack={goBack} />;
      case 'tabata': return <TabataMode key={loadKey} onBack={goBack} />;
      case 'fortime': return <ForTimeMode key={loadKey} onBack={goBack} />;
      case 'emom': return <EmomMode key={loadKey} onBack={goBack} />;
      case 'amrap': return <AmrapMode key={loadKey} onBack={goBack} />;
      case 'personalized': return <PersonalizedMode key={loadKey} onBack={goBack} />;
    }
  })();

  const iconBtnClass = `
    glass flex items-center justify-center w-12 h-12 rounded-2xl
    text-gray-200
    hover:bg-white/[0.14] hover:text-white
    active:scale-95 transition-all duration-200
  `;

  const libraryButton = (
    <button
      onClick={() => setLibraryOpen(true)}
      aria-label={t('library.open')}
      title={t('library.open')}
      className={iconBtnClass}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
    </button>
  );

  return (
    <RecordingProvider>
      {content}
      {/* Inside a workout the library lives next to the back button (top-left);
          on the main menu it stays in the top-right toolbar. */}
      {mode && (
        <div className="fixed top-6 left-[5.25rem] z-40 md:top-8 md:left-[6.25rem]">
          {libraryButton}
        </div>
      )}
      <div className="fixed top-6 right-6 z-40 flex gap-3 md:top-8 md:right-10">
        <button
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className={`hidden md:flex ${iconBtnClass}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isFullscreen
              ? <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/>
              : <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
            }
          </svg>
        </button>
        {!mode && libraryButton}
        <VideoRecordButton />
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          className={iconBtnClass}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z"/>
          </svg>
        </button>
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <WorkoutLibrary open={libraryOpen} onClose={() => setLibraryOpen(false)} onLoad={loadWorkout} />
      <WodInfoPanel info={mode ? loadedWod : null} />
      <CameraPreview />
      <RecordingResultModal />
    </RecordingProvider>
  );
}

export default App;
