import { useCallback, useMemo, useState } from 'react';
import { TimerLayout } from './TimerLayout';
import { TimerDisplay } from './TimerDisplay';
import { Controls } from './Controls';
import type { BlockType, TrainingBlock, TabataConfig, ForTimeConfig, EmomConfig, AmrapConfig, RestConfig } from '../types/timer';
import { useTimer, buildTabataSegments, buildForTimeSegments, buildEmomSegments, buildAmrapSegments, buildRestSegments } from '../hooks/useTimer';
import { loadSetting, saveSetting } from '../utils/storage';
import { formatTime } from '../utils/format';
import { useT } from '../hooks/useI18n';
import { t as tRaw } from '../utils/i18n';

interface PersonalizedModeProps { onBack: () => void; }

let blockIdCounter = 0;
function nextId() { return `block-${++blockIdCounter}-${Date.now()}`; }

function defaultConfig(type: BlockType): TrainingBlock['config'] {
  switch (type) {
    case 'tabata': return { rounds: 8, workSeconds: 20, restSeconds: 10 };
    case 'fortime': return { minutes: 5 };
    case 'emom': return { intervalMinutes: 1, intervalSeconds: 0, rounds: 10, restSeconds: 0 };
    case 'amrap': return { minutes: 5 };
    case 'rest': return { minutes: 1, seconds: 0 };
  }
}

const blockLabelKeys: Record<BlockType, string> = {
  tabata: 'mode.tabata',
  fortime: 'mode.fortime',
  emom: 'mode.emom',
  amrap: 'mode.amrap',
  rest: 'mode.rest',
};

function buildBlockSegments(block: TrainingBlock) {
  switch (block.type) {
    case 'tabata': { const c = block.config as TabataConfig; return buildTabataSegments(c.rounds, c.workSeconds, c.restSeconds); }
    case 'fortime': { const c = block.config as ForTimeConfig; return buildForTimeSegments(c.minutes); }
    case 'emom': { const c = block.config as EmomConfig; return buildEmomSegments(c.intervalMinutes, c.intervalSeconds, c.rounds, c.restSeconds); }
    case 'amrap': { const c = block.config as AmrapConfig; return buildAmrapSegments(c.minutes); }
    case 'rest': { const c = block.config as RestConfig; return buildRestSegments(c.minutes, c.seconds); }
  }
}

const typeColors: Record<BlockType, { bg: string; text: string; accent: string; border: string }> = {
  tabata:  { bg: 'bg-orange-500/10', text: 'text-orange-400', accent: 'border-l-orange-400', border: 'border-orange-500/30' },
  fortime: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', accent: 'border-l-emerald-400', border: 'border-emerald-500/30' },
  emom:    { bg: 'bg-purple-500/10', text: 'text-purple-400', accent: 'border-l-purple-400', border: 'border-purple-500/30' },
  amrap:   { bg: 'bg-rose-500/10', text: 'text-rose-400', accent: 'border-l-rose-400', border: 'border-rose-500/30' },
  rest:    { bg: 'bg-sky-500/10', text: 'text-sky-400', accent: 'border-l-sky-400', border: 'border-sky-500/30' },
};

const allTypes: BlockType[] = ['tabata', 'fortime', 'emom', 'amrap', 'rest'];

/* ── Config row: label + value stepper ── */
function ConfigRow({ label, value, onChange, min = 0, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-gray-400 text-base font-medium">
        {label} {suffix && <span className="text-gray-600 ml-1">{suffix}</span>}
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/[0.06] text-gray-300 text-xl hover:bg-white/[0.12] hover:text-white active:scale-90 disabled:opacity-20 transition-all"
        >&minus;</button>
        <input
          type="number" value={value} min={min}
          onChange={(e) => onChange(Math.max(min, parseInt(e.target.value) || min))}
          className="w-14 h-11 bg-white/[0.04] rounded-lg text-white text-center text-lg font-bold focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        <button
          onClick={() => onChange(value + 1)}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/[0.06] text-gray-300 text-xl hover:bg-white/[0.12] hover:text-white active:scale-90 transition-all"
        >+</button>
      </div>
    </div>
  );
}

/* ── Compact summary for collapsed blocks ── */
function blockSummary(block: TrainingBlock, t: typeof tRaw): string {
  switch (block.type) {
    case 'tabata': {
      const c = block.config as TabataConfig;
      return `${c.rounds}r × ${c.workSeconds}${t('suffix.sec')} / ${c.restSeconds}${t('suffix.sec')}`;
    }
    case 'fortime': {
      const c = block.config as ForTimeConfig;
      return `${c.minutes} ${t('suffix.min')}`;
    }
    case 'emom': {
      const c = block.config as EmomConfig;
      const interval = c.intervalSeconds > 0 ? `${c.intervalMinutes}:${String(c.intervalSeconds).padStart(2, '0')}` : `${c.intervalMinutes} ${t('suffix.min')}`;
      const rest = c.restSeconds > 0 ? ` + ${c.restSeconds}${t('suffix.sec')} rest` : '';
      return `${c.rounds}r × ${interval}${rest}`;
    }
    case 'amrap': {
      const c = block.config as AmrapConfig;
      return `${c.minutes} ${t('suffix.min')}`;
    }
    case 'rest': {
      const c = block.config as RestConfig;
      const parts: string[] = [];
      if (c.minutes > 0) parts.push(`${c.minutes} ${t('suffix.min')}`);
      if (c.seconds > 0) parts.push(`${c.seconds} ${t('suffix.sec')}`);
      return parts.join(' ') || `0 ${t('suffix.sec')}`;
    }
  }
}

/* ── Block card ── */
function BlockCard({ block, index, total, expanded, onToggle, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast, t }: {
  block: TrainingBlock; index: number; total: number;
  expanded: boolean; onToggle: () => void;
  onChange: (b: TrainingBlock) => void; onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void;
  isFirst: boolean; isLast: boolean; t: typeof tRaw;
}) {
  const updateConfig = (partial: Partial<TrainingBlock['config']>) =>
    onChange({ ...block, config: { ...block.config, ...partial } });
  const colors = typeColors[block.type];

  /* ── Collapsed view ── */
  if (!expanded) {
    return (
      <div
        className={`rounded-2xl bg-white/[0.025] border border-white/[0.06] border-l-[4px] ${colors.accent} cursor-pointer hover:bg-white/[0.04] transition-all`}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`${colors.bg} ${colors.text} text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0`}>
              {index + 1}/{total}
            </span>
            <span className={`${colors.text} text-base font-bold shrink-0`}>{t(blockLabelKeys[block.type])}</span>
            <span className="text-gray-500 mx-1">—</span>
            <span className="text-gray-400 text-sm truncate">{blockSummary(block, t)}</span>
          </div>
          <svg className="w-4 h-4 text-gray-600 shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        </div>
      </div>
    );
  }

  /* ── Expanded view ── */
  return (
    <div className={`rounded-2xl bg-white/[0.025] border border-white/[0.06] border-l-[4px] ${colors.accent} overflow-hidden`}>

      {/* ── Card header ── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <span className={`${colors.bg} ${colors.text} text-sm font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider`}>
            {index + 1}/{total}
          </span>
          <span className={`${colors.text} text-lg font-bold`}>{t(blockLabelKeys[block.type])}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={onMoveUp} disabled={isFirst}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.08] active:scale-90 disabled:opacity-15 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
          </button>
          <button onClick={onMoveDown} disabled={isLast}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.08] active:scale-90 disabled:opacity-15 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <button onClick={onRemove}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {/* ── Type selector tabs ── */}
      <div className="flex gap-1.5 px-5 pb-3">
        {allTypes.map((tp) => {
          const active = block.type === tp;
          const c = typeColors[tp];
          return (
            <button
              key={tp}
              onClick={() => { if (!active) onChange({ ...block, type: tp, config: defaultConfig(tp), name: t(blockLabelKeys[tp]) }); }}
              className={`
                flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider
                transition-all duration-150
                ${active
                  ? `${c.bg} ${c.text} ${c.border} border`
                  : 'text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]'
                }
              `}
            >
              {t(blockLabelKeys[tp])}
            </button>
          );
        })}
      </div>

      {/* ── Config fields ── */}
      <div className="px-5 pb-4">
        {block.type === 'tabata' && (
          <>
            <ConfigRow label={t('label.rounds')} value={(block.config as TabataConfig).rounds} onChange={(v) => updateConfig({ rounds: v })} min={1} />
            <ConfigRow label={t('label.work')} value={(block.config as TabataConfig).workSeconds} onChange={(v) => updateConfig({ workSeconds: v })} min={1} suffix={t('suffix.sec')} />
            <ConfigRow label={t('label.rest')} value={(block.config as TabataConfig).restSeconds} onChange={(v) => updateConfig({ restSeconds: v })} suffix={t('suffix.sec')} />
          </>
        )}
        {block.type === 'fortime' && (
          <ConfigRow label={t('label.timeCap')} value={(block.config as ForTimeConfig).minutes} onChange={(v) => updateConfig({ minutes: v })} min={1} suffix={t('suffix.min')} />
        )}
        {block.type === 'emom' && (
          <>
            <ConfigRow label={t('label.every')} value={(block.config as EmomConfig).intervalMinutes} onChange={(v) => updateConfig({ intervalMinutes: v })} suffix={t('suffix.min')} />
            <ConfigRow label={t('label.and')} value={(block.config as EmomConfig).intervalSeconds} onChange={(v) => updateConfig({ intervalSeconds: v })} suffix={t('suffix.sec')} />
            <ConfigRow label={t('label.rounds')} value={(block.config as EmomConfig).rounds} onChange={(v) => updateConfig({ rounds: v })} min={1} />
            <ConfigRow label={t('label.rest')} value={(block.config as EmomConfig).restSeconds} onChange={(v) => updateConfig({ restSeconds: v })} suffix={t('suffix.sec')} />
          </>
        )}
        {block.type === 'amrap' && (
          <ConfigRow label={t('label.duration')} value={(block.config as AmrapConfig).minutes} onChange={(v) => updateConfig({ minutes: v })} min={1} suffix={t('suffix.min')} />
        )}
        {block.type === 'rest' && (
          <>
            <ConfigRow label={t('label.duration')} value={(block.config as RestConfig).minutes} onChange={(v) => updateConfig({ minutes: v })} suffix={t('suffix.min')} />
            <ConfigRow label={t('label.and')} value={(block.config as RestConfig).seconds} onChange={(v) => updateConfig({ seconds: v })} suffix={t('suffix.sec')} />
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main ── */
export function PersonalizedMode({ onBack }: PersonalizedModeProps) {
  const t = useT();
  const [blocks, setBlocks] = useState<TrainingBlock[]>(() =>
    loadSetting<TrainingBlock[]>('personalized-blocks', [
      { id: nextId(), type: 'emom', name: 'EMOM', config: { intervalMinutes: 1, intervalSeconds: 0, rounds: 10, restSeconds: 0 } },
    ])
  );
  const [totalRounds, setTotalRounds] = useState(() => loadSetting<number>('personalized-rounds', 1));
  const allSegments = useMemo(() => {
    const single = blocks.flatMap(buildBlockSegments);
    if (totalRounds <= 1) return single;
    const repeated: typeof single = [];
    for (let r = 0; r < totalRounds; r++) repeated.push(...single);
    return repeated;
  }, [blocks, totalRounds]);

  const segmentToBlock = useMemo(() => {
    const map: number[] = [];
    const rounds = totalRounds <= 1 ? 1 : totalRounds;
    for (let r = 0; r < rounds; r++) {
      blocks.forEach((block, blockIdx) => {
        const count = buildBlockSegments(block).length;
        for (let i = 0; i < count; i++) map.push(blockIdx);
      });
    }
    return map;
  }, [blocks, totalRounds]);

  const { state, start, pause, reset } = useTimer({
    segments: allSegments, countUp: false,
  });

  const handleStart = () => { if (!blocks.length) return; saveSetting('personalized-blocks', blocks); saveSetting('personalized-rounds', totalRounds); start(); };
  const handleBack = () => { reset(); onBack(); };

  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(() => blocks.length > 0 ? blocks[blocks.length - 1].id : null);
  const addBlock = useCallback(() => {
    const id = nextId();
    setBlocks((p) => [...p, { id, type: 'tabata', name: 'Tabata', config: defaultConfig('tabata') }]);
    setExpandedBlockId(id);
  }, []);
  const removeBlock = useCallback((id: string) => {
    setBlocks((p) => {
      const next = p.filter((b) => b.id !== id);
      return next;
    });
    setExpandedBlockId((prev) => prev === id ? null : prev);
  }, []);
  const updateBlock = useCallback((id: string, b: TrainingBlock) => setBlocks((p) => p.map((x) => x.id === id ? b : x)), []);
  const moveBlock = useCallback((i: number, d: -1 | 1) => setBlocks((p) => { const n = [...p]; const j = i + d; if (j < 0 || j >= n.length) return p; [n[i], n[j]] = [n[j], n[i]]; return n; }), []);

  const segIdx = state.segmentIndex ?? 0;
  const activeBlockIndex = segmentToBlock[segIdx] ?? 0;
  const currentBlock = blocks[activeBlockIndex];
  const segmentsPerRound = blocks.reduce((sum, b) => sum + buildBlockSegments(b).length, 0);
  const currentGlobalRound = segmentsPerRound > 0 ? Math.min(Math.floor(segIdx / segmentsPerRound) + 1, totalRounds) : 1;
  const roundSuffix = totalRounds > 1 ? ` (${currentGlobalRound}/${totalRounds})` : '';
  const subtitle = state.phase !== 'idle' && state.phase !== 'done' && currentBlock
    ? t('sub.blockOf', { current: activeBlockIndex + 1, total: blocks.length, name: t(blockLabelKeys[currentBlock.type]) }) + roundSuffix
    : state.phase === 'done' ? t('sub.blocksCompleted', { total: blocks.length }) + (totalRounds > 1 ? ` × ${totalRounds}` : '') : undefined;

  return (
    <TimerLayout title={t('mode.custom')} subtitle={subtitle} phase={state.phase} onBack={handleBack}>
      {state.phase === 'idle' ? (
        <div className="flex-1 min-h-0 w-full overflow-y-auto">
          <div className="w-full flex flex-col gap-4 py-2">
            {blocks.map((block, i) => (
              <BlockCard key={block.id} block={block} index={i} total={blocks.length}
                expanded={expandedBlockId === block.id}
                onToggle={() => setExpandedBlockId(expandedBlockId === block.id ? null : block.id)}
                onChange={(b) => updateBlock(block.id, b)} onRemove={() => removeBlock(block.id)}
                onMoveUp={() => moveBlock(i, -1)} onMoveDown={() => moveBlock(i, 1)}
                isFirst={i === 0} isLast={i === blocks.length - 1} t={t} />
            ))}
            <button onClick={addBlock}
              className="
                shrink-0 py-4 rounded-2xl
                border border-dashed border-white/[0.1]
                text-gray-500 text-sm font-semibold tracking-wide
                hover:border-white/[0.2] hover:text-gray-300 hover:bg-white/[0.02]
                active:scale-[0.98] transition-all
              ">
              {t('btn.addBlock')}
            </button>

            {/* Global rounds */}
            <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] px-5 py-1">
              <ConfigRow label={t('label.totalRounds')} value={totalRounds} onChange={setTotalRounds} min={1} />
            </div>
            <Controls isRunning={false} isStarted={false} isDone={false} onStart={handleStart} onPause={() => {}} onReset={() => {}} />
          </div>
        </div>
      ) : (
        <>
          <TimerDisplay
            time={state.timeLeft} phase={state.phase}
            currentRound={state.currentRound} totalRounds={state.totalRounds}
            onClick={state.phase !== 'done' ? pause : undefined}
            blockLabel={currentBlock ? t(blockLabelKeys[currentBlock.type]) : undefined}
            blockIndex={activeBlockIndex}
            blockTotal={blocks.length}
          />
          {state.phase !== 'countdown' && (
            <div className="text-center -mt-2 mb-2 flex items-center justify-center gap-4">
              {totalRounds > 1 && (
                <span className="text-yellow-400 font-bold tracking-wide" style={{ fontSize: 'clamp(1.2rem, 4vw, 2rem)' }}>
                  {t('timer.round')} {currentGlobalRound}/{totalRounds}
                </span>
              )}
              <span>
                <span className="text-gray-500 text-sm font-semibold tracking-wider uppercase mr-2">{t('label.total')}</span>
                <span className="text-gray-400 font-bold tabular-nums" style={{ fontSize: 'clamp(1.2rem, 4vw, 2rem)' }}>
                  {formatTime(state.elapsed)}
                </span>
              </span>
            </div>
          )}
          <Controls isRunning={state.isRunning} isStarted isDone={state.phase === 'done'} onStart={handleStart} onPause={pause} onReset={reset} />
        </>
      )}
    </TimerLayout>
  );
}
