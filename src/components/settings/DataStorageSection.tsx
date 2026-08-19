import React from "react";
import { SettingTopicCard } from "./SettingTopicCard";
import { SyncManager } from "../SyncManager";

interface DataStorageSectionProps {
  handleClearAllCache: () => void;
  clearStatus: string;
}

export const DataStorageSection: React.FC<DataStorageSectionProps> = ({
  handleClearAllCache,
  clearStatus,
}) => {
  return (
    <SettingTopicCard
      title="Cache & Storage Management"
      description={<>Clear cached <span className="font-vtop font-bold">VTOP</span> portal data or manage specific cached endpoints</>}
    >
      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-(--text-main)">
              Clear All Portal Cache
            </span>
            <span className="text-xs text-(--text-muted)">
              Removes offline cached data for timetable, marks, attendance, and assignments
            </span>
          </div>
          <button
            onClick={handleClearAllCache}
            className="px-5 py-2.5 rounded-full text-xs font-black uppercase bg-(--accent-base) text-(--text-inverse) transition-all border-0 cursor-pointer disabled:opacity-50 hover:opacity-90 ml-2"
          >
            Clear Cache
          </button>
        </div>

        {clearStatus && (
          <span className="text-xs font-bold text-(--text-muted)">
            {clearStatus}
          </span>
        )}

        <div className="border-t-2 border-(--border-dim) pt-4 mt-2">
          <span className="text-xs font-bold uppercase font-expanded text-(--text-muted) mb-2 block">
            Cached Endpoint Explorer
          </span>
          <SyncManager />
        </div>
      </div>
    </SettingTopicCard>
  );
};
