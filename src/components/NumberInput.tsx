import { useState } from 'react';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}

export function NumberInput({ label, value, onChange, min = 0, max = 999, suffix }: NumberInputProps) {
  // While the user is typing we show their raw text (so the box can be
  // emptied); the clamped number is committed on every valid keystroke.
  const [draft, setDraft] = useState<string | null>(null);

  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(Math.min(max, value + 1));

  const handleInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits === '') {
      setDraft('');
      return;
    }
    const v = parseInt(digits, 10);
    setDraft(String(v)); // drops leading zeros: "010" -> "10"
    onChange(Math.max(min, Math.min(max, v)));
  };

  const handleBlur = () => {
    if (draft === '') onChange(Math.max(min, 0));
    setDraft(null);
  };

  return (
    <div className="w-full">
      {/* Label */}
      <label className="block text-gray-400 text-sm md:text-base font-medium uppercase tracking-widest mb-3">
        {label} {suffix && <span className="text-gray-600 normal-case tracking-normal">({suffix})</span>}
      </label>

      {/* Control row */}
      <div className="flex items-center gap-4">
        <button
          onClick={decrement}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="
            shrink-0 w-16 h-16 md:w-18 md:h-18
            flex items-center justify-center rounded-xl
            bg-white/[0.07] text-white text-3xl
            hover:bg-white/[0.12]
            active:scale-90
            disabled:opacity-20 disabled:active:scale-100
            transition-all
          "
        >
          &minus;
        </button>

        <input
          type="text"
          inputMode="numeric"
          value={draft ?? String(value)}
          onChange={(e) => handleInput(e.target.value)}
          onBlur={handleBlur}
          aria-label={`${label} value`}
          className="
            flex-1 h-16 md:h-18 min-w-0
            rounded-xl bg-white/[0.05]
            text-white text-center text-4xl md:text-5xl font-bold
            border-none
            focus:outline-none focus:ring-2 focus:ring-white/20
            transition-all
          "
        />

        <button
          onClick={increment}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="
            shrink-0 w-16 h-16 md:w-18 md:h-18
            flex items-center justify-center rounded-xl
            bg-white/[0.07] text-white text-3xl
            hover:bg-white/[0.12]
            active:scale-90
            disabled:opacity-20 disabled:active:scale-100
            transition-all
          "
        >
          +
        </button>
      </div>
    </div>
  );
}
