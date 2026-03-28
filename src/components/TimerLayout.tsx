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

  const bg = phase === 'rest'
    ? 'bg-[#0b3d2a]'
    : phase === 'countdown'
    ? 'bg-[#0c1220]'
    : 'bg-[#0a0a0a]';

  return (
    <div className={`h-full relative ${bg} bg-transition`}>

      {/* ── Floating header bar ── */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 pt-6 pb-4 md:px-10 md:pt-8 md:pb-5">
        <button
          onClick={onBack}
          aria-label={t('btn.back')}
          className="
            flex items-center justify-center w-12 h-12 rounded-2xl
            bg-white/[0.06] border border-white/[0.08]
            text-gray-300
            hover:bg-white/[0.12] hover:text-white hover:border-white/[0.15]
            active:scale-95 transition-all duration-200
            backdrop-blur-sm
          "
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <div className="text-center px-4">
          <h2 className="text-white text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="text-gray-400 text-xs md:text-sm mt-0.5">{subtitle}</p>}
        </div>

        {/* Spacer to balance the layout */}
        <div className="w-[7.5rem]" />
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
