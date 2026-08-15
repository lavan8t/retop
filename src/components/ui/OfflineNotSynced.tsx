import React from "react";
import { NoInternetIcon } from "../icons/NoInternetIcon";

interface OfflineNotSyncedProps {
  pageName?: string;
}

export const OfflineNotSynced = ({ pageName = "Data" }: OfflineNotSyncedProps) => {
  return (
    <div
      className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 text-center p-6 animate-in fade-in zoom-in-95 duration-300"
    >
      <div className="bg-(--bg-surface) p-8 rounded-full border-4 border-(--border-main) shadow-(--brutal-shadow-sm)">
        <NoInternetIcon size={64} className="text-(--text-muted) animate-pulse" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-(--text-main) tracking-tight">
          No Cached {pageName} Found
        </h2>
        <p className="text-(--text-muted) max-w-md mx-auto text-lg leading-relaxed">
          No saved offline data was found for this section. Login to VTOP while online to automatically sync and cache your {pageName.toLowerCase()}.
        </p>
      </div>
    </div>
  );
};
