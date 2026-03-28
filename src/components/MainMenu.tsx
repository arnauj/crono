import type { TimerMode } from '../types/timer';
import { useT } from '../hooks/useI18n';

interface MainMenuProps {
  onSelectMode: (mode: TimerMode) => void;
}

const modes: { id: TimerMode; labelKey: string; descKey: string; bg: string; hoverBg: string; text: string; descText: string }[] = [
  { id: 'clock',        labelKey: 'mode.clock',    descKey: 'mode.clock.desc',    bg: 'bg-blue-500',    hoverBg: 'hover:bg-blue-600',    text: 'text-white',     descText: 'text-blue-100' },
  { id: 'tabata',       labelKey: 'mode.tabata',   descKey: 'mode.tabata.desc',   bg: 'bg-orange-500',  hoverBg: 'hover:bg-orange-600',  text: 'text-white',     descText: 'text-orange-100' },
  { id: 'fortime',      labelKey: 'mode.fortime',  descKey: 'mode.fortime.desc',  bg: 'bg-emerald-500', hoverBg: 'hover:bg-emerald-600', text: 'text-white',     descText: 'text-emerald-100' },
  { id: 'emom',         labelKey: 'mode.emom',     descKey: 'mode.emom.desc',     bg: 'bg-purple-500',  hoverBg: 'hover:bg-purple-600',  text: 'text-white',     descText: 'text-purple-100' },
  { id: 'amrap',        labelKey: 'mode.amrap',    descKey: 'mode.amrap.desc',    bg: 'bg-rose-500',    hoverBg: 'hover:bg-rose-600',    text: 'text-white',     descText: 'text-rose-100' },
  { id: 'personalized', labelKey: 'mode.custom',   descKey: 'mode.custom.desc',   bg: 'bg-cyan-500',    hoverBg: 'hover:bg-cyan-600',    text: 'text-cyan-950', descText: 'text-cyan-900' },
];

export function MainMenu({ onSelectMode }: MainMenuProps) {
  const t = useT();

  return (
    <div className="h-full w-full bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-lg md:max-w-2xl">
        {/* Title */}
        <h1 className="text-center text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-10 md:mb-12">
          {t('app.title')}<span className="text-gray-500 font-normal">{t('app.subtitle')}</span>
        </h1>

        {/* Grid 2×3 */}
        <nav role="navigation" aria-label="Timer modes">
          <ul className="grid grid-cols-2 gap-4 md:gap-5">
            {modes.map((mode) => (
              <li key={mode.id}>
                <button
                  onClick={() => onSelectMode(mode.id)}
                  className={`
                    group w-full aspect-[4/3]
                    flex flex-col items-center justify-center gap-2
                    rounded-2xl
                    ${mode.bg} ${mode.hoverBg}
                    border border-white/[0.15]
                    active:scale-[0.96]
                    transition-all duration-200
                  `}
                >
                  <span className={`text-4xl md:text-5xl font-bold tracking-tight ${mode.text}`}>
                    {t(mode.labelKey)}
                  </span>
                  <span className={`text-base md:text-lg font-medium ${mode.descText}`}>
                    {t(mode.descKey)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
