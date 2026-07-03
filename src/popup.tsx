import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./input.css"; 

const Popup = () => {
  const [isHalted, setIsHalted] = useState(false);

  useEffect(() => {
    // Sync system theme initially
    const updateTheme = (e?: MediaQueryListEvent | MediaQueryList) => {
      const isDark = e ? e.matches : window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    };
    updateTheme();
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", updateTheme);

    chrome.storage.local.get("retop-paused-until", (res) => {
      const pausedUntil = res["retop-paused-until"];
      if (pausedUntil && Date.now() < parseInt(pausedUntil, 10)) {
        setIsHalted(true);
      }
    });

    return () => mediaQuery.removeEventListener("change", updateTheme);
  }, []);

  const toggleHalt = () => {
    if (isHalted) {
      chrome.storage.local.remove("retop-paused-until", () => {
        setIsHalted(false);
        reloadVtopTabs();
      });
    } else {
      chrome.storage.local.set(
        { "retop-paused-until": (Date.now() + 60 * 60 * 1000).toString() },
        () => {
          setIsHalted(true);
          reloadVtopTabs();
        }
      );
    }
  };

  const openSettings = () => {
    chrome.tabs.query({ url: "*://vtop.vit.ac.in/*" }, (tabs) => {
      if (tabs.length > 0) {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: "open_settings" });
          }
        });
        window.close(); // Close popup
      } else {
        chrome.tabs.create({ url: "https://vtop.vit.ac.in/vtop/" });
      }
    });
  };

  const reloadVtopTabs = () => {
    chrome.tabs.query({ url: "*://vtop.vit.ac.in/*" }, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.reload(tab.id);
        }
      });
    });
  };

  return (
    <div className="flex flex-col h-full bg-(--bg-main) p-4 gap-4 transition-colors">
      <div className="flex items-center justify-between pb-3 border-b-2 border-(--border-main)">
        <span className="font-black font-expanded uppercase tracking-tight flex items-center gap-1.5 md:gap-2 text-xl text-(--text-main)">
          <span className="material-symbols-rounded text-(--accent-base)" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700", fontSize: "28px" }}>school</span>
          retop
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {/* Halt Widget Option */}
        <div 
          onClick={toggleHalt}
          className={`flex items-center justify-between p-4 rounded-[20px] cursor-pointer transition-all border-3 ${isHalted ? 'bg-[#fee2e2] border-[#ef4444] text-[#7f1d1d]' : 'bg-(--bg-surface) border-(--border-main) text-(--text-main) hover:shadow-[4px_4px_0_0_var(--shadow-main)]'}`}
        >
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm uppercase font-expanded">{isHalted ? "Resume retop" : "Halt retop"}</span>
            <span className="text-xs font-medium opacity-80 leading-tight">
              {isHalted ? "Enable the extension again" : "Disable extension for 1 hour"}
            </span>
          </div>
          <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700", fontSize: '28px' }}>
            {isHalted ? "play_arrow" : "pause"}
          </span>
        </div>

        {/* Settings Option */}
        <div 
          onClick={openSettings}
          className="flex items-center justify-between p-4 rounded-[20px] bg-(--bg-surface) border-3 border-(--border-main) cursor-pointer hover:shadow-[4px_4px_0_0_var(--shadow-main)] transition-all group"
        >
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm uppercase font-expanded text-(--text-main)">Settings</span>
            <span className="text-xs font-medium text-(--text-muted) leading-tight">
              Customize colors, themes, and UI
            </span>
          </div>
          <span className="material-symbols-rounded text-(--accent-base) group-hover:rotate-45 transition-transform duration-300" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700", fontSize: '28px' }}>
            settings
          </span>
        </div>
      </div>
    </div>
  );
};

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<Popup />);
}
