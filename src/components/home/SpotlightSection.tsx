import React from "react";
import {
  Campaign,
  OpenInNew,
  Download,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { SpotlightCategoryGroup, SpotlightLinkItem } from "../../types/vtop";

interface SpotlightSectionProps {
  spotlightCategories: SpotlightCategoryGroup[];
}

export const SpotlightSection: React.FC<SpotlightSectionProps> = ({
  spotlightCategories,
}) => {
  if (!spotlightCategories || spotlightCategories.length === 0) {
    return null;
  }

  const handleLinkClick = (item: SpotlightLinkItem) => {
    if (item.downloadId) {
      const downloadUrl = item.downloadId.startsWith("http")
        ? item.downloadId
        : `https://vtop.vit.ac.in/vtop/${item.downloadId}`;
      window.open(downloadUrl, "_blank");
    } else if (item.url) {
      const targetUrl = item.url.startsWith("http")
        ? item.url
        : `https://vtop.vit.ac.in/vtop/${item.url}`;
      window.open(targetUrl, "_blank");
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 relative mb-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-expanded font-black text-xs md:text-sm uppercase tracking-wide text-(--text-main)">
            Spotlight
          </span>
        </div>

        <Campaign className="w-8 h-8 text-(--text-main) mix-blend-overlay opacity-80 shrink-0" />
      </div>
      {/* Categories Grouped List */}
      <div className="flex flex-col gap-4 pt-1 pr-1">
        {spotlightCategories.map((group, gIdx) => {
          if (!group.items || group.items.length === 0) return null;
          return (
            <div key={gIdx} className="flex flex-col gap-1.5">
              <span className="text-[10px] font-expanded font-bold uppercase tracking-wider text-(--text-muted) px-1">
                {group.category}
              </span>
              <div className="flex flex-col gap-[2px] rounded-2xl overflow-hidden">
                {group.items.map((item: SpotlightLinkItem, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => handleLinkClick(item)}
                    className="group flex items-center justify-between p-3 bg-(--bg-highlight) hover:bg-(--border-dim) border-0 transition-all cursor-pointer rounded-sm first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <div className="flex flex-col flex-1 min-w-0 pr-2">
                      <span className="text-xs font-black text-(--text-main) group-hover:text-(--accent-base) transition-colors break-words">
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
        })}
      </div>
    </div>
  );
};
