import React, { useMemo } from 'react';
import {
  Campaign,
  OpenInNew,
  Download,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { SpotlightCategoryGroup, SpotlightLinkItem } from '../../types/vtop';
import { Card } from '../ui/Card';

interface SpotlightSectionProps {
  spotlightCategories: SpotlightCategoryGroup[];
  isMobileWidget?: boolean;
  className?: string;
}

export const SpotlightSection: React.FC<SpotlightSectionProps> = ({
  spotlightCategories,
  isMobileWidget = false,
  className = '',
}) => {
  const items = useMemo(() => {
    if (!spotlightCategories || spotlightCategories.length === 0) return [];
    return spotlightCategories.flatMap((g) => g.items || []);
  }, [spotlightCategories]);

  if (
    !spotlightCategories ||
    spotlightCategories.length === 0 ||
    items.length === 0
  ) {
    return null;
  }

  const handleLinkClick = (item: SpotlightLinkItem) => {
    if (item.downloadId) {
      const downloadUrl = item.downloadId.startsWith('http')
        ? item.downloadId
        : `https://vtop.vit.ac.in/vtop/${item.downloadId}`;
      window.open(downloadUrl, '_blank');
    } else if (item.url) {
      const targetUrl = item.url.startsWith('http')
        ? item.url
        : `https://vtop.vit.ac.in/vtop/${item.url}`;
      window.open(targetUrl, '_blank');
    }
  };

  // Compact Mobile Widget Mode
  if (isMobileWidget) {
    return (
      <Card
        className={`w-full bg-(--bg-highlight) rounded-4xl flex flex-col relative z-30 overflow-hidden border-2 border-(--border-main) shadow-(--brutal-shadow-sm) hover:shadow-(--brutal-shadow-hover) transition-all ${className}`}
      >
        {/* Widget Header */}
        <div className="px-5 pt-4 pb-3 border-b-2 border-(--border-main) flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Campaign className="w-4 h-4 text-(--accent-base)" />
            <span className="text-[0.625rem] font-expanded font-bold uppercase text-(--text-muted) leading-none">
              Spotlight ({items.length})
            </span>
          </div>
        </div>

        {/* Items List */}
        <div className="p-3 flex flex-col gap-1 max-h-75 overflow-y-auto custom-scrollbar">
          {items.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleLinkClick(item)}
              className="flex items-center justify-between p-2.5 rounded-xl bg-(--bg-surface) hover:bg-(--border-dim) transition-colors cursor-pointer active:scale-[0.99]"
            >
              <div className="flex flex-col flex-1 min-w-0 pr-2">
                <span className="text-xs font-bold text-(--text-main) line-clamp-2 leading-snug">
                  {item.title}
                </span>
              </div>
              <div className="shrink-0 text-(--text-muted) pl-1">
                {item.isDownload ? (
                  <Download className="w-4 h-4 text-(--accent-base)" />
                ) : (
                  <OpenInNew className="w-4 h-4 text-(--accent-base)" />
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Desktop Left Column View
  return (
    <div className={`w-full flex flex-col gap-3 relative mb-4 ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-expanded font-black text-xs md:text-sm uppercase tracking-wide text-(--text-main)">
            Spotlight
          </span>
        </div>

        <Campaign className="w-8 h-8 text-(--text-main) mix-blend-overlay opacity-80 shrink-0" />
      </div>
      {/* Items List */}
      <div className="flex flex-col gap-[2px] rounded-2xl overflow-hidden pt-1 pr-1">
        {items.map((item: SpotlightLinkItem, idx: number) => (
          <div
            key={idx}
            onClick={() => handleLinkClick(item)}
            className="group flex items-center justify-between p-3 bg-(--bg-highlight) hover:bg-(--border-dim) border-0 transition-all cursor-pointer rounded-sm first:rounded-t-2xl last:rounded-b-2xl"
          >
            <div className="flex flex-col flex-1 min-w-0 pr-2">
              <span className="text-xs font-black text-(--text-main) group-hover:text-(--accent-base) transition-colors wrap-break-words">
                {item.title}
              </span>
            </div>

            <div className="shrink-0 text-(--text-muted) group-hover:text-(--accent-base) transition-colors">
              {item.isDownload ? (
                <Download className="w-4 h-4" />
              ) : (
                <OpenInNew className="w-4 h-4" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
