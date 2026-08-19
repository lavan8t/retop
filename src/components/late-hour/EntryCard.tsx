import React from "react";
import {
  Cancel,
  Category,
  Person,
  Schedule,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { LateHourStatusEntry } from "../../types/vtop";
import { StatusBadge } from "./StatusBadge";

interface EntryCardProps {
  entry: LateHourStatusEntry;
  onCancel?: (id: string) => void;
  cancelling?: boolean;
}

export const EntryCard: React.FC<EntryCardProps> = ({
  entry,
  onCancel,
  cancelling = false,
}) => {
  const isPending =
    entry.status.toLowerCase().includes("pending") ||
    entry.status.toLowerCase().includes("raised");

  return (
    <div className="bg-(--bg-surface) border border-(--border-dim)/40 rounded-3xl p-4 md:p-5 flex flex-col gap-3 hover:bg-(--bg-highlight) transition-colors">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-(--text-main) truncate">
            {entry.venue || "—"}
          </p>
          <p className="text-xs text-(--text-muted) mt-0.5 line-clamp-2">
            {entry.details || "—"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={entry.status} />
          {onCancel && isPending && entry.id && (
            <button
              onClick={() => onCancel(entry.id)}
              disabled={cancelling}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-(--att-danger-container) text-(--att-danger) hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50">
              <Cancel className="w-3 h-3" />
              {cancelling ? "Cancelling..." : "Cancel"}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-(--text-muted)">
          <Category className="w-3 h-3 text-(--accent-base)" />
          {entry.eventType || "—"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-(--text-muted)">
          <Person className="w-3 h-3 text-(--accent-base)" />
          {entry.appliedTo || "—"}
        </span>
      </div>

      {/* Date + time timeline pill */}
      <div className="flex items-center gap-0 w-full">
        <div className="px-3.5 py-2 rounded-full bg-(--bg-main) border border-r-0 border-(--border-dim)/60 text-xs font-mono font-bold flex flex-col items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-(--text-muted) uppercase leading-none mb-0.5">
            From
          </span>
          <span className="text-(--text-main) leading-none">
            {entry.fromDate || "—"}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-between py-2 px-4 rounded-2xl bg-(--bg-main)/60 border border-(--border-dim)/40 text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-(--text-muted) uppercase">
              To
            </span>
            <span className="font-bold text-(--text-main)">
              {entry.toDate || "—"}
            </span>
          </div>
          {entry.time && (
            <div className="flex items-center gap-1.5 text-(--text-muted) shrink-0">
              <Schedule className="w-3 h-3 text-(--accent-base)" />
              <span className="font-bold">{entry.time}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
