import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PlayArrow, Pause, CloudOff } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { applyTheme, useSettingsStore } from "./utils/settings-store";

const Popup = () => {
  const [isHalted, setIsHalted] = useState(false);
  const { settings, updateSetting } = useSettingsStore();

  useEffect(() => {
    applyTheme(settings);
  }, [settings]);

  useEffect(() => {
    chrome.storage.local.get("retop-paused-until", (res) => {
      const pausedUntil = res["retop-paused-until"] as string;
      if (pausedUntil && Date.now() < parseInt(pausedUntil, 10)) {
        setIsHalted(true);
      }
    });
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
        },
      );
    }
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
    <div className="flex flex-col h-full bg-[#0d0d0d] p-4 gap-4">
      <div className="flex items-center justify-center pb-2 pt-2">
        <h2 className="text-[2.5rem] text-content-inverse font-logo cursor-default tracking-tighter leading-none lowercase">
          retop
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {/* Halt Widget Option */}
        <div
          onClick={toggleHalt}
          className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${isHalted ? "bg-red-500/10 text-att-danger" : "bg-white/5 hover:bg-white/10 text-content-inverse"}`}
        >
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm uppercase font-expanded">
              {isHalted ? "Resume retop" : "Halt retop"}
            </span>
            <span
              className={`text-xs font-medium leading-tight ${isHalted ? "opacity-80" : "text-white/50"}`}
            >
              {isHalted
                ? "Enable the extension again"
                : "Disable extension for 1 hour"}
            </span>
          </div>
          <span style={{ fontSize: "24px", display: "flex" }}>
            {isHalted ? <PlayArrow width="1em" height="1em" /> : <Pause width="1em" height="1em" />}
          </span>
        </div>

        {/* Offline Mode Option */}
        <div
          onClick={() => {
            chrome.tabs.create({
              url: chrome.runtime.getURL("dist/offline.html"),
            });
            window.close();
          }}
          className="flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all bg-white/5 hover:bg-white/10 text-content-inverse"
        >
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm uppercase font-expanded">
              Offline Cache
            </span>
            <span className="text-xs font-medium leading-tight text-white/50">
              View your cached data without internet
            </span>
          </div>
          <span style={{ fontSize: "24px", display: "flex" }}>
            <CloudOff width="1em" height="1em" />
          </span>
        </div>

        {/* Theme Selection */}
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-white/5">
          <span className="font-bold text-sm uppercase font-expanded text-content-inverse">
            App Theme
          </span>
          <div className="flex items-center gap-1 w-full shrink-0">
            {["light", "dark", "amoled", "auto"].map((mode, idx, arr) => {
              const isActive = settings.themeMode === mode;
              const isFirst = idx === 0;
              const isLast = idx === arr.length - 1;
              const rounding = isFirst
                ? "rounded-l-xl rounded-r-md"
                : isLast
                  ? "rounded-l-md rounded-r-xl"
                  : "rounded-md";
              const activeRounding = "rounded-xl";
              return (
                <button
                  key={mode}
                  onClick={() => {
                    updateSetting("themeMode", mode as any);
                  }}
                  className={`flex-1 flex justify-center items-center px-2 py-2.5 text-[10px] font-bold font-expanded uppercase transition-all duration-fast ${
                    isActive
                      ? `bg-(--accent-base) text-content-inverse shadow-none ${activeRounding}`
                      : `bg-black/50 text-white/50 hover:bg-black/80 hover:text-white shadow-none ${rounding}`
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<Popup />);
}
