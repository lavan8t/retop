import React from 'react';
import { NoInternetIcon } from '../icons/NoInternetIcon';

interface OfflineNotSyncedProps {
  pageName?: string;
}

export const OfflineNotSynced = ({
  pageName = 'Data',
}: OfflineNotSyncedProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 text-center p-6">
      <div className="bg-(--bg-surface) p-8 rounded-full border-4 border-(--border-main) shadow-(--brutal-shadow-sm)">
        <NoInternetIcon
          aria-hidden="true"
          size={64}
          className="text-(--text-muted)"
        />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-(--text-main) tracking-tight">
          No cached {pageName.toLowerCase()} found
        </h2>
        <p className="text-(--text-muted) max-w-md mx-auto text-lg leading-relaxed">
          No saved offline data was found for this section. Sign in to{' '}
          <span className="font-vtop font-bold">VTOP</span> while online to
          automatically sync and cache your {pageName.toLowerCase()}.
        </p>
      </div>
    </div>
  );
};
