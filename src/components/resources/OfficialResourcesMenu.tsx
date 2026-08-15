import React, { useState, useEffect, useRef } from "react";
import { Apps } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { parseOfficialResources, OfficialResourceItem } from "../../parsers/resources";

export const DEFAULT_OFFICIAL_RESOURCES: OfficialResourceItem[] = [
  // Web Applications
  {
    id: "web_library",
    title: "Central Library",
    url: "https://webopaccc.vit.ac.in/",
    category: "Web Applications",
    badge: "Web",
  },
  {
    id: "web_vtop",
    title: "VTOP",
    url: "https://vtopcc.vit.ac.in/vtop/login",
    category: "Web Applications",
    badge: "Web",
  },
  {
    id: "web_vit",
    title: "VIT",
    url: "https://chennai.vit.ac.in/",
    category: "Web Applications",
    badge: "Web",
  },
  {
    id: "web_mail",
    title: "Mail",
    url: "https://www.gmail.com/",
    category: "Web Applications",
    badge: "Web",
  },
  {
    id: "web_freshers",
    title: "Freshers",
    url: "https://resourcecc.vit.ac.in/freshersinstructions.html",
    category: "Web Applications",
    badge: "Web",
  },
  {
    id: "web_vhelp",
    title: "V-Help",
    url: "https://vhelp.vit.ac.in/vitcc-help-center/",
    category: "Web Applications",
    badge: "Web",
  },
  {
    id: "web_lms",
    title: "Moodle",
    url: "https://lms.vit.ac.in/login/index.php",
    category: "Web Applications",
    badge: "Web",
  },
  {
    id: "web_eventhub",
    title: "Event Hub",
    url: "https://eventhubcc.vit.ac.in/EventHub/",
    category: "Web Applications",
    badge: "Web",
  },
  // Mobile Applications (Play Store)
  {
    id: "android_vitian",
    title: "VITianCC",
    url: "https://play.google.com/store/apps/details?id=edu.vit.vitiancc&pcampaignid=web_share",
    category: "Mobile Applications On Playstore",
    badge: "Android",
  },
  {
    id: "android_eventhub",
    title: "Event Hub",
    url: "https://play.google.com/store/apps/details?id=edu.vit.eventhub&pcampaignid=web_share",
    category: "Mobile Applications On Playstore",
    badge: "Android",
  },
  // Mobile Applications (App Store)
  {
    id: "ios_vitian",
    title: "VITianCC",
    url: "https://vtopcc2.vit.ac.in/vitiancc.html",
    category: "Mobile Applications On Appstore",
    badge: "iOS",
  },
  {
    id: "ios_eventhub",
    title: "Event Hub",
    url: "https://vtopcc2.vit.ac.in/vitcceventhub.html",
    category: "Mobile Applications On Appstore",
    badge: "iOS",
  },
];

export const getOfficialResources = (): OfficialResourceItem[] => {
  const isChennai =
    typeof window !== "undefined" && window.location.hostname.includes("vtopcc");

  if (!isChennai) {
    return [
      { id: "web_library", title: "Central Library", url: "https://webopac.vit.ac.in/", category: "Web Applications", badge: "Web" },
      { id: "web_vtop", title: "VTOP", url: "https://vtop.vit.ac.in/vtop/login", category: "Web Applications", badge: "Web" },
      { id: "web_vit", title: "VIT", url: "https://vit.ac.in/", category: "Web Applications", badge: "Web" },
      { id: "web_mail", title: "Mail", url: "https://www.gmail.com/", category: "Web Applications", badge: "Web" },
      { id: "web_freshers", title: "Freshers", url: "https://resource.vit.ac.in/freshersinstructions.html", category: "Web Applications", badge: "Web" },
      { id: "web_vhelp", title: "V-Help", url: "https://vhelp.vit.ac.in/", category: "Web Applications", badge: "Web" },
      { id: "web_lms", title: "Moodle", url: "https://lms.vit.ac.in/login/index.php", category: "Web Applications", badge: "Web" },
      { id: "web_eventhub", title: "Event Hub", url: "https://eventhub.vit.ac.in/EventHub/", category: "Web Applications", badge: "Web" },
      { id: "android_vitian", title: "VITian", url: "https://play.google.com/store/apps/details?id=edu.vit.vitian&pcampaignid=web_share", category: "Mobile Applications On Playstore", badge: "Android" },
      { id: "android_eventhub", title: "Event Hub", url: "https://play.google.com/store/apps/details?id=edu.vit.eventhub&pcampaignid=web_share", category: "Mobile Applications On Playstore", badge: "Android" },
      { id: "ios_vitian", title: "VITian", url: "https://vtop2.vit.ac.in/vitian.html", category: "Mobile Applications On Appstore", badge: "iOS" },
      { id: "ios_eventhub", title: "Event Hub", url: "https://vtop2.vit.ac.in/vitcceventhub.html", category: "Mobile Applications On Appstore", badge: "iOS" },
    ];
  }

  return DEFAULT_OFFICIAL_RESOURCES;
};

interface OfficialResourcesMenuProps {
  resources?: OfficialResourceItem[];
}

export const OfficialResourcesMenu: React.FC<OfficialResourcesMenuProps> = ({
  resources,
}) => {
  const isChennai =
    (typeof window !== "undefined" && window.location.hostname.includes("vtopcc")) ||
    (typeof document !== "undefined" && document.documentElement.getAttribute("data-campus") === "chennai");

  if (!isChennai) return null;

  const [isOpen, setIsOpen] = useState(false);
  const items = resources || getOfficialResources();
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const appItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const filteredItems = items;

  useEffect(() => {
    setSelectedIndex(0);
  }, [isOpen]);

  // Click outside listener & full keyboard arrow key grid navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const path = e.composedPath ? e.composedPath() : [e.target as Node];
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        !path.includes(containerRef.current)
      ) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      const total = filteredItems.length;
      if (total === 0) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % total);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + total) % total);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 3 < total ? prev + 3 : prev % 3));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 3 >= 0 ? prev - 3 : Math.max(0, total - (3 - (prev % 3)))));
      } else if (e.key === "Enter" || e.key === " ") {
        if (filteredItems[selectedIndex]) {
          e.preventDefault();
          window.open(filteredItems[selectedIndex].url, "_blank", "noopener,noreferrer");
        }
      }
    };

    document.addEventListener("mousedown", handleOutside, true);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, filteredItems, selectedIndex]);

  // Auto-scroll selected app into view
  useEffect(() => {
    if (isOpen && selectedIndex >= 0 && appItemRefs.current[selectedIndex]) {
      appItemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [isOpen, selectedIndex]);

  return (
    <div ref={containerRef} className="relative flex items-center pointer-events-auto">
      {/* Apps Launcher Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Campus Applications"
        title="Campus Applications"
        className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
          isOpen
            ? "bg-(--bg-card) text-(--accent-base) shadow-inner border border-(--border-main)"
            : "hover:bg-(--bg-card) text-(--text-muted) hover:text-(--text-main)"
        }`}
      >
        <Apps className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* Material 3 Compact Popover: 3 Columns Grid */}
      {isOpen && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{ transformOrigin: "right top" }}
          className="absolute right-0 top-full mt-2 w-72 md:w-80 max-h-[50vh] overflow-y-auto search-scrollbar bg-(--bg-surface) border-2 border-(--border-main) rounded-3xl popup-shadow p-2.5 md:p-3 z-9999 animate-popup-open"
        >
          {/* 3-Column Apps Grid */}
          <div className="grid grid-cols-3 gap-2 md:gap-2.5">
            {filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <a
                  key={item.id}
                  ref={(el) => {
                    appItemRefs.current[idx] = el;
                  }}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`group relative flex flex-col items-center justify-center p-2 md:p-2.5 rounded-2xl transition-all text-center no-underline cursor-pointer outline-none ${
                    isSelected
                      ? "bg-(--bg-highlight) border-2 border-(--accent-base) shadow-xs"
                      : "bg-transparent hover:bg-(--bg-highlight) border-2 border-transparent hover:border-(--border-dim)"
                  }`}
                >
                  {/* Platform Badge */}
                  {item.badge && item.badge !== "Web" && (
                    <span className="absolute top-1 right-1 text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded-full bg-(--accent-base)/15 text-(--accent-base)">
                      {item.badge}
                    </span>
                  )}

                  {/* Icon Container */}
                  <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-(--bg-highlight) flex items-center justify-center mb-1.5 transition-transform overflow-hidden shadow-xs border border-(--border-dim)">
                    {item.icon ? (
                      <img
                        src={item.icon}
                        alt={item.title}
                        className="w-6 h-6 md:w-7 md:h-7 object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-(--accent-base)/15 text-(--accent-base) flex items-center justify-center font-bold text-xs uppercase font-mono">
                        {item.title.slice(0, 2)}
                      </div>
                    )}
                  </div>

                  {/* Regular Bold Title */}
                  <span className="text-[11px] md:text-xs font-bold text-(--text-main) group-hover:text-(--accent-base) transition-colors line-clamp-2 leading-tight">
                    {item.title}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
