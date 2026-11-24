import React from 'react';
import { SettingTopicList } from './SettingTopicList';
import { SyncManager } from '../SyncManager';

interface DataStorageSectionProps {
  handleClearAllCache: () => void;
  clearStatus: string;
}

export const DataStorageSection: React.FC<DataStorageSectionProps> = ({
  handleClearAllCache,
  clearStatus,
}) => {
  return (
    <SettingTopicList title="Cache & Storage Management">
      <m3e-list-item>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-(--text-main)">
              Clear All Portal Cache
            </span>
            <span className="text-xs text-(--text-muted)">
              Removes offline cached data for timetable, marks, attendance, and
              assignments
            </span>
          </div>
          <button
            onClick={handleClearAllCache}
            className="min-h-12 px-5 rounded-full text-sm font-semibold bg-(--md-sys-color-error) text-(--md-sys-color-on-error) outline-none focus-visible:ring-2 focus-visible:ring-(--md-sys-color-error) transition-colors border-0 cursor-pointer disabled:opacity-50 hover:opacity-90 ml-2"
          >
            Clear Cache
          </button>
        </div>
      </m3e-list-item>

      {clearStatus && (
        <m3e-list-item>
          <span className="text-xs font-semibold text-(--text-muted)">
            {clearStatus}
          </span>
        </m3e-list-item>
      )}

      <m3e-list-item className="min-h-0">
        <div className="w-full">
          <span className="text-xs font-semibold uppercase font-expanded text-(--text-muted) mb-2 block">
            Cached Endpoint Explorer
          </span>
          <SyncManager />
        </div>
      </m3e-list-item>
    </SettingTopicList>
  );
};
