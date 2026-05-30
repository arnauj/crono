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

/* ── Floating live camera preview ── */
export function CameraPreview() {
  const t = useT();
  const { enabled, status, error, videoRef } = useRecording();
  if (!enabled) return null;

  const recording = status === 'recording';

  return (
    <div className="fixed bottom-5 left-5 z-40 w-28 md:w-36 select-none">
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.12] bg-black shadow-2xl aspect-[3/4]">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="w-full h-full object-cover -scale-x-100"
        />
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 backdrop-blur-sm">
          <span className={`inline-block w-2 h-2 rounded-full ${recording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white">
            {recording ? t('record.recording') : 'REC'}
          </span>
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-[11px] leading-tight text-red-400 font-medium">{error}</p>
      )}
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
