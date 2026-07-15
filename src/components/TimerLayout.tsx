import type { ReactNode } from 'react';
import type { TimerPhase } from '../types/timer';
import { useT } from '../hooks/useI18n';

interface TimerLayoutProps {
  title: string;
  subtitle?: string;
  phase: TimerPhase;
  onBack: () => void;
  children: ReactNode;
}

export function TimerLayout({ title, subtitle, phase, onBack, children }: TimerLayoutProps) {
  const t = useT();

  return (
    <div className="h-full relative aurora-bg overflow-hidden">

      {/* Phase tint overlays, crossfaded over the ambient aurora backdrop */}
      <div
        aria-hidden
        className={`absolute inset-0 pointer-events-none aurora-rest transition-opacity duration-500 ${phase === 'rest' ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        aria-hidden
        className={`absolute inset-0 pointer-events-none aurora-countdown transition-opacity duration-500 ${phase === 'countdown' ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* ── Floating header bar ── */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 pt-6 pb-4 md:px-10 md:pt-8 md:pb-5">
        <button
          onClick={onBack}
          aria-label={t('btn.back')}
          className="
            glass flex items-center justify-center w-12 h-12 rounded-2xl
            text-gray-200
            hover:bg-white/[0.14] hover:text-white
            active:scale-95 transition-all duration-200
          "
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <div className="text-center px-4">
          <h2 className="text-white text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="text-gray-400 text-xs md:text-sm mt-0.5">{subtitle}</p>}
        </div>

        {/* Spacer to balance the layout */}
        <div className="w-12" />
      </header>

      {/* ── Content: full viewport, centered ── */}
      <main className="h-full flex flex-col items-center justify-center px-6 pt-24 pb-6 md:px-10 md:pt-28 md:pb-10">
        <div className="w-full max-w-xl flex flex-col flex-1 min-h-0">
          {children}
        </div>
      </main>
    </div>
  );
}
