import { useCallback, useMemo, useState } from 'react';
import { TimerLayout } from './TimerLayout';
import { TimerDisplay } from './TimerDisplay';
import { Controls } from './Controls';
import type { BlockType, TrainingBlock, TabataConfig, ForTimeConfig, EmomConfig, AmrapConfig } from '../types/timer';
import { useTimer, buildTabataSegments, buildForTimeSegments, buildEmomSegments, buildAmrapSegments } from '../hooks/useTimer';
import { loadSetting, saveSetting } from '../utils/storage';

interface PersonalizedModeProps { onBack: () => void; }

let blockIdCounter = 0;
function nextId() { return `block-${++blockIdCounter}-${Date.now()}`; }

function defaultConfig(type: BlockType): TrainingBlock['config'] {
  switch (type) {
    case 'tabata': return { rounds: 8, workSeconds: 20, restSeconds: 10 };
    case 'fortime': return { minutes: 5 };
    case 'emom': return { intervalMinutes: 1, intervalSeconds: 0, rounds: 10, restSeconds: 0 };
    case 'amrap': return { minutes: 5 };
  }
}

function blockLabel(type: BlockType): string {
  switch (type) {
    case 'tabata': return 'Tabata';
    case 'fortime': return 'For Time';
    case 'emom': return 'EMOM';
    case 'amrap': return 'AMRAP';
  }
}

function buildBlockSegments(block: TrainingBlock) {
  switch (block.type) {
    case 'tabata': { const c = block.config as TabataConfig; return buildTabataSegments(c.rounds, c.workSeconds, c.restSeconds); }
    case 'fortime': { const c = block.config as ForTimeConfig; return buildForTimeSegments(c.minutes); }
    case 'emom': { const c = block.config as EmomConfig; return buildEmomSegments(c.intervalMinutes, c.intervalSeconds, c.rounds, c.restSeconds); }
    case 'amrap': { const c = block.config as AmrapConfig; return buildAmrapSegments(c.minutes); }
  }
}

const typeColors: Record<BlockType, { bg: string; text: string; accent: string; border: string }> = {
  tabata:  { bg: 'bg-orange-500/10', text: 'text-orange-400', accent: 'border-l-orange-400', border: 'border-orange-500/30' },
  fortime: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', accent: 'border-l-emerald-400', border: 'border-emerald-500/30' },
  emom:    { bg: 'bg-purple-500/10', text: 'text-purple-400', accent: 'border-l-purple-400', border: 'border-purple-500/30' },
  amrap:   { bg: 'bg-rose-500/10', text: 'text-rose-400', accent: 'border-l-rose-400', border: 'border-rose-500/30' },
};

const allTypes: BlockType[] = ['tabata', 'fortime', 'emom', 'amrap'];

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
          aria-label={`Decrease ${label}`}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/[0.06] text-gray-300 text-xl hover:bg-white/[0.12] hover:text-white active:scale-90 disabled:opacity-20 transition-all"
        >&minus;</button>
        <input
          type="number" value={value} min={min}
          onChange={(e) => onChange(Math.max(min, parseInt(e.target.value) || min))}
          aria-label={`${label} value`}
          className="w-14 h-11 bg-white/[0.04] rounded-lg text-white text-center text-lg font-bold focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        <button
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/[0.06] text-gray-300 text-xl hover:bg-white/[0.12] hover:text-white active:scale-90 transition-all"
        >+</button>
      </div>
    </div>
  );
}

/* ── Block card ── */
function BlockCard({ block, index, total, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: {
  block: TrainingBlock; index: number; total: number;
  onChange: (b: TrainingBlock) => void; onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void;
  isFirst: boolean; isLast: boolean;
}) {
  const updateConfig = (partial: Partial<TrainingBlock['config']>) =>
    onChange({ ...block, config: { ...block.config, ...partial } });
  const colors = typeColors[block.type];

  return (
    <div className={`rounded-2xl bg-white/[0.025] border border-white/[0.06] border-l-[4px] ${colors.accent} overflow-hidden`}>

      {/* ── Card header ── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <span className={`${colors.bg} ${colors.text} text-sm font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider`}>
            {index + 1}/{total}
          </span>
          <span className={`${colors.text} text-lg font-bold`}>{blockLabel(block.type)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button onClick={onMoveUp} disabled={isFirst} aria-label="Move up"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.08] active:scale-90 disabled:opacity-15 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
          </button>
          <button onClick={onMoveDown} disabled={isLast} aria-label="Move down"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.08] active:scale-90 disabled:opacity-15 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <button onClick={onRemove} aria-label={`Remove block ${index + 1}`}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {/* ── Type selector tabs ── */}
      <div className="flex gap-1.5 px-5 pb-3">
        {allTypes.map((t) => {
          const active = block.type === t;
          const c = typeColors[t];
          return (
            <button
              key={t}
              onClick={() => { if (!active) onChange({ ...block, type: t, config: defaultConfig(t), name: blockLabel(t) }); }}
              className={`
                flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider
                transition-all duration-150
                ${active
                  ? `${c.bg} ${c.text} ${c.border} border`
                  : 'text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]'
                }
              `}
            >
              {blockLabel(t)}
            </button>
          );
        })}
      </div>

      {/* ── Config fields ── */}
      <div className="px-5 pb-4">
        {block.type === 'tabata' && (
          <>
            <ConfigRow label="Rounds" value={(block.config as TabataConfig).rounds} onChange={(v) => updateConfig({ rounds: v })} min={1} />
            <ConfigRow label="Work" value={(block.config as TabataConfig).workSeconds} onChange={(v) => updateConfig({ workSeconds: v })} min={1} suffix="sec" />
            <ConfigRow label="Rest" value={(block.config as TabataConfig).restSeconds} onChange={(v) => updateConfig({ restSeconds: v })} suffix="sec" />
          </>
        )}
        {block.type === 'fortime' && (
          <ConfigRow label="Time cap" value={(block.config as ForTimeConfig).minutes} onChange={(v) => updateConfig({ minutes: v })} min={1} suffix="min" />
        )}
        {block.type === 'emom' && (
          <>
            <ConfigRow label="Every" value={(block.config as EmomConfig).intervalMinutes} onChange={(v) => updateConfig({ intervalMinutes: v })} suffix="min" />
            <ConfigRow label="And" value={(block.config as EmomConfig).intervalSeconds} onChange={(v) => updateConfig({ intervalSeconds: v })} suffix="sec" />
            <ConfigRow label="Rounds" value={(block.config as EmomConfig).rounds} onChange={(v) => updateConfig({ rounds: v })} min={1} />
            <ConfigRow label="Rest" value={(block.config as EmomConfig).restSeconds} onChange={(v) => updateConfig({ restSeconds: v })} suffix="sec" />
          </>
        )}
        {block.type === 'amrap' && (
          <ConfigRow label="Duration" value={(block.config as AmrapConfig).minutes} onChange={(v) => updateConfig({ minutes: v })} min={1} suffix="min" />
        )}
      </div>
    </div>
  );
}

/* ── Main ── */
export function PersonalizedMode({ onBack }: PersonalizedModeProps) {
  const [blocks, setBlocks] = useState<TrainingBlock[]>(() =>
    loadSetting<TrainingBlock[]>('personalized-blocks', [
      { id: nextId(), type: 'emom', name: 'EMOM', config: { intervalMinutes: 1, intervalSeconds: 0, rounds: 10, restSeconds: 0 } },
    ])
  );
  const allSegments = useMemo(() => blocks.flatMap(buildBlockSegments), [blocks]);

  // Precompute mapping: segment index → block index
  const segmentToBlock = useMemo(() => {
    const map: number[] = [];
    blocks.forEach((block, blockIdx) => {
      const count = buildBlockSegments(block).length;
      for (let i = 0; i < count; i++) map.push(blockIdx);
    });
    return map;
  }, [blocks]);

  const { state, start, pause, reset } = useTimer({
    segments: allSegments, countUp: false,
  });

  const handleStart = () => { if (!blocks.length) return; saveSetting('personalized-blocks', blocks); start(); };
  const handleBack = () => { reset(); onBack(); };

  const addBlock = useCallback(() => setBlocks((p) => [...p, { id: nextId(), type: 'tabata', name: 'Tabata', config: defaultConfig('tabata') }]), []);
  const removeBlock = useCallback((id: string) => setBlocks((p) => p.filter((b) => b.id !== id)), []);
  const updateBlock = useCallback((id: string, b: TrainingBlock) => setBlocks((p) => p.map((x) => x.id === id ? b : x)), []);
  const moveBlock = useCallback((i: number, d: -1 | 1) => setBlocks((p) => { const n = [...p]; const t = i + d; if (t < 0 || t >= n.length) return p; [n[i], n[t]] = [n[t], n[i]]; return n; }), []);

  const segIdx = state.segmentIndex ?? 0;
  const activeBlockIndex = segmentToBlock[segIdx] ?? 0;
  const currentBlock = blocks[activeBlockIndex];
  const subtitle = state.phase !== 'idle' && state.phase !== 'done' && currentBlock
    ? `Block ${activeBlockIndex + 1}/${blocks.length} — ${currentBlock.name}`
    : state.phase === 'done' ? `${blocks.length} blocks completed` : undefined;

  return (
    <TimerLayout title="Custom" subtitle={subtitle} phase={state.phase} onBack={handleBack}>
      {state.phase === 'idle' ? (
        <div className="flex-1 min-h-0 w-full overflow-y-auto">
          <div className="w-full flex flex-col gap-4 py-2">
            {blocks.map((block, i) => (
              <BlockCard key={block.id} block={block} index={i} total={blocks.length}
                onChange={(b) => updateBlock(block.id, b)} onRemove={() => removeBlock(block.id)}
                onMoveUp={() => moveBlock(i, -1)} onMoveDown={() => moveBlock(i, 1)}
                isFirst={i === 0} isLast={i === blocks.length - 1} />
            ))}
            <button onClick={addBlock}
              className="
                shrink-0 py-4 rounded-2xl
                border border-dashed border-white/[0.1]
                text-gray-500 text-sm font-semibold tracking-wide
                hover:border-white/[0.2] hover:text-gray-300 hover:bg-white/[0.02]
                active:scale-[0.98] transition-all
              ">
              + Add block
            </button>
            <Controls isRunning={false} isStarted={false} isDone={false} onStart={handleStart} onPause={() => {}} onReset={() => {}} />
          </div>
        </div>
      ) : (
        <>
          <TimerDisplay
            time={state.timeLeft} phase={state.phase}
            currentRound={state.currentRound} totalRounds={state.totalRounds}
            onClick={state.phase !== 'done' ? pause : undefined}
            blockLabel={currentBlock ? blockLabel(currentBlock.type) : undefined}
            blockIndex={activeBlockIndex}
            blockTotal={blocks.length}
          />
          <Controls isRunning={state.isRunning} isStarted isDone={state.phase === 'done'} onStart={handleStart} onPause={pause} onReset={reset} />
        </>
      )}
    </TimerLayout>
  );
}
