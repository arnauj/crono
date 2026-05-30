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

/* ── Floating live camera preview: draggable, resizable, fullscreen, rotatable ── */
export function CameraPreview() {
  const t = useT();
  const { enabled, status, error, videoRef, canvasRef, streamReady, orientation, toggleOrientation } = useRecording();

  const [pos, setPos] = useState(() => ({
    x: 16,
    y: typeof window !== 'undefined' ? window.innerHeight - 260 : 16,
  }));
  const [mini, setMini] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, origX: 0, origY: 0 });
  const canvasHostRef = useRef<HTMLDivElement | null>(null);

  const landscape = orientation === 'landscape';
  const baseW = mini ? (landscape ? 168 : 100) : (landscape ? 280 : 168);
  // Match the recorded canvas aspect so the preview shows it without cropping.
  const aspect = landscape ? 16 / 9 : 9 / 16; // width / height
  const width = baseW;
  const height = Math.round(baseW / aspect);

  // Mount the live compositing canvas (camera + overlay) into the preview.
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
  }, [canvasRef, streamReady]);

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

  if (!enabled) return null;
  const recording = status === 'recording';

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
    <div style={containerStyle} className="select-none" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <div className={`relative w-full h-full overflow-hidden bg-black shadow-2xl border border-white/[0.14] ${fullscreen ? '' : 'rounded-2xl'}`}>
        {/* Live composite (camera + countdown + info), exactly what gets recorded */}
        <div ref={canvasHostRef} className="absolute inset-0" />
        {/* Hidden camera source feeding the canvas */}
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="absolute w-px h-px opacity-0 pointer-events-none"
        />

        {/* REC badge */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 backdrop-blur-sm">
          <span className={`inline-block w-2 h-2 rounded-full ${recording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white">
            {recording ? t('record.recording') : 'REC'}
          </span>
        </div>

        {/* Toolbar */}
        <div className="absolute top-1.5 right-1.5 flex gap-1">
          <PreviewButton label={t('record.rotate')} onClick={toggleOrientation}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </PreviewButton>
          {!fullscreen && (
            <PreviewButton label={mini ? t('record.expand') : t('record.minimize')} onClick={() => setMini((m) => !m)}>
              {mini ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /></svg>
              )}
            </PreviewButton>
          )}
          <PreviewButton label={t('record.fullscreen')} onClick={() => setFullscreen((f) => !f)}>
            {fullscreen ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" /></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" /></svg>
            )}
          </PreviewButton>
        </div>

        {error && (
          <p className="absolute bottom-1.5 left-1.5 right-1.5 text-center text-[11px] leading-tight text-red-300 font-medium bg-black/55 rounded-md px-1 py-0.5">{error}</p>
        )}
      </div>
    </div>
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
