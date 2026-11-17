import React from 'react';

interface BrandMarkProps {
  inverted?: boolean;
  compact?: boolean;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ inverted = false, compact = false }) => {
  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className={`flex items-center justify-center rounded-lg border shrink-0 ${
          compact ? 'w-9 h-9' : 'w-10 h-10'
        } ${
          inverted
            ? 'bg-teal-500/15 border-teal-400/35 text-teal-300'
            : 'bg-navy-900 border-navy-800 text-teal-300'
        }`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3l7 3v5c0 4.5-3 8.4-7 9.9-4-1.5-7-5.4-7-9.9V6l7-3z" strokeLinejoin="round" />
          <path d="M9.5 12l1.8 1.8 3.5-3.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="min-w-0">
        <div
          className={`font-display font-bold tracking-tight leading-none whitespace-nowrap ${
            compact ? 'text-base' : 'text-lg'
          } ${inverted ? 'text-white' : 'text-navy-900'}`}
        >
          SIGAP PPA
        </div>
        <div
          className={`text-xs mt-1 leading-none whitespace-nowrap ${
            inverted ? 'text-slate-300' : 'text-slate-500'
          }`}
        >
          UPTD PPA Kab. Sidoarjo
        </div>
      </div>
    </div>
  );
};
