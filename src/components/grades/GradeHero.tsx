import React from 'react';

interface GradeHeroProps {
  value: string;
  label: string;
  /** Optional context line, e.g. the semester the value belongs to. */
  subLabel?: string;
}

/** Centered hero figure — primary, heavy numeric, muted label underneath. */
export const GradeHero: React.FC<GradeHeroProps> = ({
  value,
  label,
  subLabel,
}) => (
  <div className="flex flex-col items-center text-center py-5 gap-1.5">
    <span className="text-6xl sm:text-7xl font-black font-expanded text-(--accent-base) leading-none tabular-nums tracking-tight">
      {value}
    </span>
    <span className="text-[11px] font-bold uppercase tracking-widest text-(--text-muted)">
      {label}
    </span>
    {subLabel && (
      <span className="text-[11px] font-medium text-(--text-dim)">
        {subLabel}
      </span>
    )}
  </div>
);
