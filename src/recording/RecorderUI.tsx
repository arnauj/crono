import {
  useCallback, useEffect, useRef, useState,
  type CSSProperties, type ReactNode, type PointerEvent as ReactPointerEvent,
} from 'react';
import { useRecording } from './context';
import { useT } from '../hooks/useI18n';

/* ── Toggle button (sits next to the gear) ── */
export function VideoRecordButton() {
  const t = useT();
  const { enabled, status, supported, toggle } = useRecording();
  if (!supported) return null;

  const recording = status === 'recording';

  return (
    <button
      onClick={toggle}
      aria-label={t('record.title')}
      aria-pressed={enabled}
      title={t('record.title')}
      className={`
        relative flex items-center justify-center w-12 h-12 rounded-2xl
        border transition-all duration-200 active:scale-95 backdrop-blur-sm
        ${enabled
          ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30 hover:text-red-300'
          : 'bg-white/[0.06] border-white/[0.08] text-gray-300 hover:bg-white/[0.12] hover:text-white hover:border-white/[0.15]'
        }
      `}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
      {recording && (
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500" />
        </span>
      )}
    </button>
  );
}

/* ── Small overlay control button (shared by the preview toolbar) ── */
function PreviewButton({ label, onClick, children }: {
  label: string; onClick: () => void; children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex items-center justify-center w-7 h-7 rounded-lg bg-black/45 text-white/90 hover:bg-black/70 hover:text-white active:scale-90 transition-all backdrop-blur-sm"
    >
      {children}
    </button>
  );
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

/* ── Bottom-centre control inside the camera: record → start → stop ──
   Mirrors the camera-driven workout flow: an empty camera shows a round red
   record button; once recording, it becomes a green "start" button to begin the
   workout; once running, a red "stop" button ends it. */
function CameraWorkoutControl({ compact }: { compact?: boolean }) {
  const t = useT();
  const { armed, status, workoutStarted, startRecordingManual, startWorkout, stopWorkout } = useRecording();

  const recording = status === 'recording';
  const kind: 'record' | 'start' | 'stop' | null =
    recording ? (workoutStarted ? 'stop' : 'start') : (armed ? 'record' : null);
  if (!kind) return null;

  const size = compact ? 'w-14 h-14' : 'w-[4.5rem] h-[4.5rem]';
  const ringPad = compact ? 'p-[3px]' : 'p-1';

  const hint =
    kind === 'record' ? t('record.startRecording')
    : kind === 'start' ? t('record.tapToStart')
    : t('btn.stop');

  const onClick =
    kind === 'record' ? startRecordingManual
    : kind === 'start' ? startWorkout
    : stopWorkout;

  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 pointer-events-none"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {!compact && (
        <span className="pointer-events-none select-none rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm animate-rec-hint">
          {hint}
        </span>
      )}

      <button
        aria-label={hint}
        title={hint}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`pointer-events-auto ${size} ${ringPad} rounded-full flex items-center justify-center
          border-[3px] border-white/90 bg-black/30 backdrop-blur-sm shadow-2xl
          transition-all duration-200 active:scale-90 hover:border-white`}
      >
        {kind === 'record' && (
          <span className="block w-full h-full rounded-full bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.7)] animate-rec-pulse" />
        )}
        {kind === 'start' && (
          <span className="flex w-full h-full items-center justify-center rounded-full bg-gradient-to-b from-green-400 to-green-500 shadow-[0_0_18px_rgba(34,197,94,0.7)] animate-rec-pulse">
            <svg width={compact ? 20 : 26} height={compact ? 20 : 26} viewBox="0 0 24 24" fill="#06240f" className="ml-[2px]">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        )}
        {kind === 'stop' && (
          <span className="flex w-full h-full items-center justify-center rounded-full bg-gradient-to-b from-red-500 to-red-600 shadow-[0_0_18px_rgba(239,68,68,0.7)]">
            <span className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} rounded-[5px] bg-white`} />
          </span>
        )}
      </button>
    </div>
  );
}

/* ── Floating live camera preview: draggable, resizable, fullscreen, rotatable ── */
export function CameraPreview() {
  const t = useT();
  const { enabled, status, error, videoRef, canvasRef, streamReady, orientation, toggleOrientation, switchCamera, armed, workoutStarted } = useRecording();

  const [pos, setPos] = useState(() => ({
    x: 16,
    y: typeof window !== 'undefined' ? window.innerHeight - 260 : 16,
  }));
  const [collapsed, setCollapsed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, origX: 0, origY: 0 });
  const canvasHostRef = useRef<HTMLDivElement | null>(null);

  const landscape = orientation === 'landscape';
  const baseW = landscape ? 280 : 168;
  // Match the recorded canvas aspect so the preview shows it without cropping.
  const aspect = landscape ? 16 / 9 : 9 / 16; // width / height
  const width = baseW;
  const height = Math.round(baseW / aspect);

  // Mount the live compositing canvas (camera + overlay) into whichever host is
  // currently rendered (the preview box, or the hidden holder while collapsed —
  // keeping it mounted lets the recording keep running).
  useEffect(() => {
    const host = canvasHostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.objectFit = 'cover';
    canvas.style.display = 'block';
    host.appendChild(canvas);
    return () => { if (canvas.parentNode === host) host.removeChild(canvas); };
  }, [canvasRef, streamReady, collapsed, fullscreen]);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    if (fullscreen) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [fullscreen, pos]);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!dragging) return;
    const { startX, startY, origX, origY } = dragRef.current;
    const maxX = window.innerWidth - width - 8;
    const maxY = window.innerHeight - height - 8;
    setPos({
      x: clamp(origX + e.clientX - startX, 8, Math.max(8, maxX)),
      y: clamp(origY + e.clientY - startY, 8, Math.max(8, maxY)),
    });
  }, [dragging, width, height]);

  const endDrag = useCallback((e: ReactPointerEvent) => {
    setDragging(false);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);

  // While there's a pending action (load to record, or record to start), keep
  // the preview expanded so the round button stays reachable.
  const actionPending = armed || (status === 'recording' && !workoutStarted);

  // The camera screen only appears once a workout has been loaded (armed) or
  // while a recording is running — not merely because video mode is on.
  if (!enabled || !(armed || status === 'recording')) return null;
  const recording = status === 'recording';
  const showBar = collapsed && !fullscreen && !actionPending;

  const containerStyle: CSSProperties = fullscreen
    ? { position: 'fixed', inset: 0, zIndex: 55 }
    : {
        position: 'fixed',
        left: clamp(pos.x, 8, typeof window !== 'undefined' ? Math.max(8, window.innerWidth - width - 8) : pos.x),
        top: clamp(pos.y, 8, typeof window !== 'undefined' ? Math.max(8, window.innerHeight - height - 8) : pos.y),
        width,
        height,
        zIndex: 40,
        touchAction: 'none',
        cursor: dragging ? 'grabbing' : 'grab',
      };

  return (
    <>
      {/* Hidden camera source feeding the canvas — kept in a stable position so
          the stream stays attached across collapse / expand / fullscreen. */}
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className="fixed w-px h-px opacity-0 pointer-events-none -z-10"
      />

      {showBar ? (
        /* Collapsed: a slim bar at the bottom centre. The canvas stays mounted
           (hidden) so the recording keeps running. */
        <>
          <div ref={canvasHostRef} className="fixed w-px h-px opacity-0 pointer-events-none -z-10 overflow-hidden" aria-hidden />
          <button
            onClick={() => setCollapsed(false)}
            aria-label={t('record.expand')}
            title={t('record.expand')}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded-full bg-black/70 border border-white/[0.14] px-4 py-2 backdrop-blur-sm shadow-2xl hover:bg-black/85 active:scale-95 transition-all"
          >
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${recording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-white">{t('record.videoMode')}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
        </>
      ) : (
        <div style={containerStyle} className="select-none" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <div className={`relative w-full h-full overflow-hidden bg-black shadow-2xl border border-white/[0.14] ${fullscreen ? '' : 'rounded-2xl'}`}>
            {/* Live composite (camera + countdown + info), exactly what gets recorded */}
            <div ref={canvasHostRef} className="absolute inset-0" />

            {/* REC badge */}
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 backdrop-blur-sm">
              <span className={`inline-block w-2 h-2 rounded-full ${recording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                {recording ? t('record.recording') : 'REC'}
              </span>
            </div>

            {/* Toolbar */}
            <div className="absolute top-1.5 right-1.5 flex gap-1">
              <PreviewButton label={t('record.switchCamera')} onClick={switchCamera}>
                {/* YouTube-style flat icon: switch camera */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 11.5v-2H9v2L5.5 12 9 8.5v2h6v-2l3.5 3.5-3.5 3.5z" />
                </svg>
              </PreviewButton>
              <PreviewButton label={t('record.rotate')} onClick={toggleOrientation}>
                {/* YouTube-style flat icon: screen rotation (portrait / landscape) */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 4.84 18.29 0 12 0l-.66.03 3.81 3.81 1.33-1.32zm-6.25-.77c-.59-.59-1.54-.59-2.12 0L1.75 8.11c-.59.59-.59 1.54 0 2.12l12.02 12.02c.59.59 1.54.59 2.12 0l6.36-6.36c.59-.59.59-1.54 0-2.12L10.23 1.75zm4.6 19.44L2.81 9.17l6.36-6.36 12.02 12.02-6.36 6.36zm-7.31.29C4.25 19.94 1.91 16.76 1.55 13H.05C.56 19.16 5.71 24 12 24l.66-.03-3.81-3.81-1.33 1.32z" />
                </svg>
              </PreviewButton>
              {!fullscreen && (
                <PreviewButton label={t('record.minimize')} onClick={() => setCollapsed(true)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /></svg>
                </PreviewButton>
              )}
              <PreviewButton label={t('record.fullscreen')} onClick={() => setFullscreen((f) => !f)}>
                {/* YouTube-style flat fullscreen icons (enter / exit) */}
                {fullscreen ? (
                  <svg width="15" height="15" viewBox="0 0 36 36" fill="currentColor"><path d="M14 14h-4v2h6v-6h-2v4zm-4 8h4v4h2v-6h-6v2zm12 4h2v-4h4v-2h-6v6zm2-12v-4h-2v6h6v-2h-4z" /></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 36 36" fill="currentColor"><path d="M10 16h2v-4h4v-2h-6v6zm2 8h-2v6h6v-2h-4v-4zm12 0h-4v2h4v4h2v-6h-2zm-2-12v2h4v4h2v-6h-6z" /></svg>
                )}
              </PreviewButton>
            </div>

            {error && (
              <p className="absolute top-9 left-1.5 right-1.5 text-center text-[11px] leading-tight text-red-300 font-medium bg-black/55 rounded-md px-1 py-0.5">{error}</p>
            )}

            {/* Camera-driven workout control (record → start → stop) */}
            <CameraWorkoutControl compact={!fullscreen} />
          </div>
        </div>
      )}
    </>
  );
}

/* ── Result modal: preview + download / share ── */
export function RecordingResultModal() {
  const t = useT();
  const { status, result, clearResult } = useRecording();
  if (status !== 'preview' || !result) return null;

  const download = () => {
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare;
  const share = async () => {
    try {
      const blob = await (await fetch(result.url)).blob();
      const file = new File([blob], result.filename, { type: result.mime });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: t('record.preview') });
      } else {
        download();
      }
    } catch {
      /* user cancelled or share failed — no-op */
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={clearResult}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl bg-[#141414] border border-white/[0.08] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <h3 className="text-white text-lg font-bold tracking-tight">{t('record.preview')}</h3>
          <button
            onClick={clearResult}
            aria-label={t('record.discard')}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.08] active:scale-90 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <video
            src={result.url}
            controls
            playsInline
            className="w-full rounded-xl bg-black border border-white/[0.06]"
          />

          <div className="flex gap-3">
            <button
              onClick={download}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold hover:bg-cyan-500/30 active:scale-[0.98] transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              {t('record.download')}
            </button>
            {canShare && (
              <button
                onClick={share}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.06] text-gray-200 border border-white/[0.1] font-semibold hover:bg-white/[0.12] active:scale-[0.98] transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                {t('record.share')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
