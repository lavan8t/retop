import React from 'react';
import {
  CheckCircle,
  Cancel,
  HourglassEmpty,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = status.toLowerCase();
  if (s.includes('approved') || s.includes('successful')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--att-safe-container) text-(--att-safe)">
        <CheckCircle className="w-3 h-3" />
        Approved
      </span>
    );
  }
  if (s.includes('cancel') || s.includes('reject')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--att-danger-container) text-(--att-danger)">
        <Cancel className="w-3 h-3" />
        Cancelled
      </span>
    );
  }
  if (s.includes('pending') || s.includes('raised')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--att-warn-container) text-(--att-warn)">
        <HourglassEmpty className="w-3 h-3" />
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--bg-highlight) text-(--text-muted)">
      {status || '—'}
    </span>
  );
};
