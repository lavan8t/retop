import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowForward,
  AccountCircle,
  Add,
  Upload,
  Key,
  CheckCircle,
  Error as ErrorIcon,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { renderDashboard } from "./pages/app";
import { getStorageData, setStorageData } from "./utils/storageAdapter";
import { getUserPinRecord, saveUserPin, verifyUserPin } from "./utils/pinSecurity";
import { asciiArtTT, asciiArtSMV, asciiArtMGR, asciiArtCC } from "./components/asciiArt";

import { getExtUrl } from "./utils/url";
import { applyTheme } from "./utils/settings-store";
import { GlobalOverflowTooltip } from "./components/ui/Tooltip";
import { VitEmblemLoader } from "./components/common/VitEmblemLoader";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { clear as idbClear, set as idbSet } from "idb-keyval";


// Resolve asset paths for both ext (chrome-extension://) and web contexts
const getAssetUrl = (path: string): string => {
  try {
    if (typeof chrome !== "undefined" && chrome.runtime && !!chrome.runtime.getURL) {
      return getExtUrl(`dist/${path}`);
    }
  } catch {}
  return `/${path}`;
};

const VIT_LOGO_URL = getAssetUrl("/assets/vitLogo.svg");

const pickAsciiArt = (): { art: string; type: string } => {
  const isChennai = typeof window !== "undefined" && window.location.hostname.includes("vtopcc");
  const artTypes = isChennai ? (["CC"] as const) : (["TT", "SMV", "MGR", "CC"] as const);
  const picked = artTypes[Math.floor(Math.random() * artTypes.length)];
  const artMap: Record<string, string> = { TT: asciiArtTT, SMV: asciiArtSMV, MGR: asciiArtMGR, CC: asciiArtCC.trim() ? asciiArtCC : asciiArtTT };
  return { art: (artMap[picked] || asciiArtTT).replace(/\r/g, ""), type: picked };
};

const GSF: React.CSSProperties = {
  fontFamily: "'Google Sans Flex', system-ui, sans-serif",
};

const GSF_MONO: React.CSSProperties = {
  fontFamily: "'Google Sans Flex', system-ui, sans-serif",
  fontVariationSettings: '"wdth" 75, "wght" 700',
  letterSpacing: "0.3em",
};

export interface CachedUser {
  regNo: string;
  username?: string;
  name: string;
  profileImgBase64?: string;
  lastActive: number;
  campus?: "vellore" | "chennai";
}

/* ── Account Switcher Dropdown (semester-dropdown style) ─────────────── */
interface AccountDropdownProps {
  users: CachedUser[];
  activeUser: CachedUser;
  onSelect: (u: CachedUser) => void;
  onImport: () => void;
}

const AccountDropdown: React.FC<AccountDropdownProps> = ({ users, activeUser, onSelect, onImport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeLabel = activeUser.username || activeUser.regNo;
  const activeCampus = activeUser.campus === "chennai" ? "Chennai" : "Vellore";

  useEffect(() => {
    if (!isOpen) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      const path = e.composedPath ? e.composedPath() : [e.target as Node];
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        !path.includes(containerRef.current)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside, true);
    document.addEventListener("touchstart", onOutside, true);
    return () => {
      document.removeEventListener("mousedown", onOutside, true);
      document.removeEventListener("touchstart", onOutside, true);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full max-w-[280px] mx-auto">
      {/* Trigger button — shows active username & campus */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 bg-[#18181b] border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 transition-colors cursor-pointer group"
        style={GSF}>
        {activeUser.profileImgBase64 ? (
          <img src={activeUser.profileImgBase64} alt={activeLabel} className="w-5 h-5 rounded-full object-cover border border-blue-500/50 shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <AccountCircle className="w-3.5 h-3.5" />
          </div>
        )}
        <div className="flex-1 text-left min-w-0 flex items-center gap-1.5">
          <div className="text-xs font-bold text-white leading-snug truncate" style={GSF}>{activeLabel}</div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 shrink-0">
            {activeCampus}
          </span>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-slate-400 transition-transform duration-100 ${isOpen ? "rotate-180 text-white" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown menu — pure CSS smooth transition */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 top-full pt-1.5 animate-in fade-in slide-in-from-top-1 duration-100"
          style={{ willChange: "transform, opacity" }}>
          <div className="w-full bg-[#18181b] border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-1 space-y-0.5">
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {users.map((u) => {
                const isSelected = u.regNo === activeUser.regNo;
                const itemLabel = u.username || u.regNo;
                const itemCampus = u.campus === "chennai" ? "Chennai" : "Vellore";
                return (
                  <button
                    key={u.regNo}
                    type="button"
                    onClick={() => { onSelect(u); setIsOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer text-left ${
                      isSelected
                        ? "bg-blue-600 text-white font-bold"
                        : "text-slate-300 hover:bg-[#27272a] hover:text-white"
                    }`}
                    style={GSF}>
                    {u.profileImgBase64 ? (
                      <img src={u.profileImgBase64} alt={itemLabel} className="w-5 h-5 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-slate-300 shrink-0">
                        <AccountCircle className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                      <span className="text-xs truncate">{itemLabel}</span>
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded ${
                        isSelected ? "bg-white/20 text-white" : "bg-blue-500/10 text-blue-400"
                      }`}>
                        {itemCampus}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Import option as footer */}
            <div className="border-t border-slate-800/80 pt-1">
              <button
                type="button"
                onClick={() => { onImport(); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#27272a] transition-colors cursor-pointer text-xs text-left"
                style={GSF}>
                <Add className="w-4 h-4 shrink-0" />
                <span className="font-bold">Import backup JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── 4-Digit Discrete Box PIN Input Component ────────────────────────── */
interface PinBoxesProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: (pinVal?: string) => void;
  error?: boolean;
}

const PinBoxes: React.FC<PinBoxesProps> = ({ value, onChange, onSubmit, error }) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Auto-focus first empty box on mount
    const firstEmpty = Math.min(value.length, 3);
    inputsRef.current[firstEmpty]?.focus();

    const onGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in another input/textarea or using modifier keys
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const targetIdx = Math.min(value.length, 3);
      inputsRef.current[targetIdx]?.focus();

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const arr = value.split("");
        arr[targetIdx] = e.key;
        const newVal = arr.join("").slice(0, 4);
        onChange(newVal);

        if (newVal.length === 4) {
          if (onSubmit) onSubmit(newVal);
        } else if (targetIdx < 3) {
          inputsRef.current[targetIdx + 1]?.focus();
        }
      }
    };

    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, [value, onChange, onSubmit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (!raw) {
      const arr = value.split("");
      arr[idx] = "";
      onChange(arr.join(""));
      return;
    }

    const char = raw.slice(-1);
    const arr = value.split("");
    arr[idx] = char;
    const newVal = arr.join("").slice(0, 4);
    onChange(newVal);

    if (newVal.length === 4) {
      if (onSubmit) onSubmit(newVal);
    } else if (idx < 3) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      if (!value[idx] && idx> 0) {
        inputsRef.current[idx - 1]?.focus();
        const arr = value.split("");
        arr[idx - 1] = "";
        onChange(arr.join(""));
      }
    } else if (e.key === "Enter") {
      if (onSubmit) onSubmit(value);
    } else if (e.key === "ArrowLeft" && idx> 0) {
      inputsRef.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 3) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 4);
    if (pasted) {
      onChange(pasted);
      if (pasted.length === 4 && onSubmit) {
        onSubmit(pasted);
      } else {
        const targetIdx = Math.min(pasted.length, 3);
        inputsRef.current[targetIdx]?.focus();
      }
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 py-2">
      {[0, 1, 2, 3].map((idx) => {
        const val = value[idx] || "";
        return (
          <input
            key={idx}
            ref={(el) => { inputsRef.current[idx] = el; }}
            type="password"
            maxLength={1}
            value={val}
            onChange={(e) => handleChange(e, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onPaste={handlePaste}
            className={`w-12 h-14 text-center text-2xl font-bold bg-[#18181b] border-2 rounded-xl text-white outline-none transition-all shadow-md ${
              error
                ? "border-red-500 bg-red-500/10 focus:border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                : val
                ? "border-blue-500 bg-[#27272a] focus:border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                : "border-slate-700 hover:border-slate-500 focus:border-blue-500 focus:bg-[#27272a]"
            }`}
            style={{
              fontFamily: "'Google Sans Flex', system-ui, sans-serif",
              fontVariationSettings: '"wdth" 100, "wght" 700',
            }} />
        );
      })}
    </div>
  );
};


const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";

const AsciiPanel: React.FC = () => {
  const preRef = useRef<HTMLPreElement>(null);
  const { art, type } = useRef(pickAsciiArt()).current;
  const originalLines = useRef(art.split("\n"));
  const ripples = useRef<{ x: number; y: number; t: number }[]>([]);
  const rafRef = useRef<number>(0);
  const lastMouse = useRef({ x: -9999, y: -9999, t: 0 });

  const charW = type === "SMV" ? 2.5 : type === "MGR" ? 2.9 : 4.2;
  const charH = type === "SMV" ? 4 : type === "MGR" ? 4.4 : 7;

  const fontSize = type === "SMV" ? "4.2px" : type === "MGR" ? "4.8px" : "7px";
  const lineH = type === "SMV" ? "4px" : type === "MGR" ? "4.4px" : "7px";
  const marginRight = type === "TT" ? "-15vw" : "0px";

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    pre.style.setProperty("font-size", fontSize, "important");
    pre.style.setProperty("line-height", lineH, "important");
    pre.style.setProperty("letter-spacing", "0px", "important");
    pre.style.setProperty("margin-right", marginRight, "important");

    const onMove = (e: MouseEvent) => {
      const rect = pre.getBoundingClientRect();
      const now = Date.now();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = x - lastMouse.current.x;
      const dy = y - lastMouse.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist> 6 || ripples.current.length === 0) {
        ripples.current.push({ x, y, t: now });
        if (ripples.current.length> 20) ripples.current.shift();
      }
      lastMouse.current = { x, y, t: now };
    };

    let animFrame: number;
    const animate = () => {
      const now = Date.now();
      ripples.current = ripples.current.filter((r) => now - r.t < 900);
      if (ripples.current.length === 0) {
        animFrame = requestAnimationFrame(animate);
        return;
      }

      const lines = originalLines.current;
      let out = "";
      for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        const offsetX = Math.max(0, pre.clientWidth - line.length * charW);
        let newLine = "";
        for (let col = 0; col < line.length; col++) {
          const char = line[col];
          if (char === " ") { newLine += " "; continue; }
          const px = offsetX + col * charW;
          const py = row * charH;
          let wave = 0;
          for (const r of ripples.current) {
            const dx = px - r.x;
            const dy = py - r.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const age = now - r.t;
            const waveR = age * 0.15;
            const dw = Math.abs(dist - waveR);
            if (dw < 30) {
              wave += Math.cos(dw * 0.1) * Math.pow(Math.max(0, 1 - dw / 30), 2) * Math.pow(Math.max(0, 1 - age / 900), 2);
            }
          }
          newLine += Math.abs(wave)> 0.2 ? CHARS[Math.floor(Math.random() * CHARS.length)] : char;
        }
        out += newLine + "\n";
      }
      if (pre) pre.textContent = out.slice(0, -1);
      animFrame = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", onMove);
    animFrame = requestAnimationFrame(animate);
    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(animFrame);
    };
  }, []);

  return (
    <pre
      ref={preRef}
      id="retop-ascii-art"
      style={{
        fontFamily: "monospace",
        fontSize,
        lineHeight: lineH,
        letterSpacing: "0px",
        textAlign: "right",
        margin: 0,
        marginRight,
        padding: 0,
        whiteSpace: "pre",
        overflow: "hidden",
        width: "100%",
        userSelect: "none",
        pointerEvents: "auto",
        animation: "retop-ascii-rise 0.5s linear forwards",
      }}>
      {art}
    </pre>
  );
};

const OfflineApp = () => {
  const [step, setStep] = useState<"LOADING" | "NO_CACHE" | "PIN_LOCK" | "UNLOCKED">("LOADING");
  const [usersIndex, setUsersIndex] = useState<CachedUser[]>([]);
  const [activeUser, setActiveUser] = useState<CachedUser | null>(null);
  const [hasPinSet, setHasPinSet] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);

  const [isSettingPin, setIsSettingPin] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>("");
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string>("");
  const [showForgotPinModal, setShowForgotPinModal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResetCacheAndRedirect = async () => {
    try {
      await idbClear();
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = "https://vtop.vit.ac.in/vtop/open/page";
  };

  useEffect(() => {
    loadCachedProfiles();
    if (typeof window !== "undefined" && "serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    let pageName = "Offline Cache";
    if (step === "PIN_LOCK") pageName = "Login";
    else if (step === "UNLOCKED") pageName = "Home";
    const isChennai =
      (typeof window !== "undefined" && window.location.hostname.includes("vtopcc")) ||
      (activeUser as any)?.campus === "chennai";
    const brand = isChennai ? "retop Chennai" : "retop";
    document.title = `${pageName} - ${brand}`;
  }, [step, activeUser]);

  const loadCachedProfiles = async () => {
    const res = await getStorageData([
      "retop_cached_users",
      "retop_lastAuthId",
      "retop-saved-username",
      "retop_lastName",
      "retop_profileImage",
      "retop_active_user",
      "retop-settings",
    ]);

    try {
      const rawSettings = res["retop-settings"];
      if (rawSettings) {
        let parsed = rawSettings;
        if (typeof rawSettings === "string") {
          try {
            const decoded = rawSettings.startsWith("enc_")
              ? decodeURIComponent(atob(rawSettings.slice(4)))
              : rawSettings;
            parsed = JSON.parse(decoded);
          } catch {}
        }
        const settings = parsed?.state?.settings || parsed;
        if (settings) applyTheme(settings);
      }
    } catch {}

    let users: CachedUser[] = res.retop_cached_users || [];
    const lastAuthId = res.retop_lastAuthId as string;
    const savedUsername = (res["retop-saved-username"] as string) || lastAuthId;
    const lastName = res.retop_lastName as string;
    const profileImg = res.retop_profileImage as string;

    if (users.length === 0 && lastAuthId) {
      users = [
        {
          regNo: lastAuthId,
          username: savedUsername,
          name: lastName || "Student",
          profileImgBase64: profileImg || "",
          lastActive: Date.now(),
        },
      ];
    } else {
      users = users.map((u) => ({
        ...u,
        username: u.username || (u.regNo === lastAuthId ? savedUsername : u.regNo),
      }));
    }

    // Comprehensive IndexedDB fallback scan if users list is still empty
    if (users.length === 0) {
      try {
        const { getAllStorageData } = await import("./utils/storageAdapter");
        const allData = await getAllStorageData();
        const portalData = allData["portal-app-storage"]?.state?.data || allData["portal-app-storage"]?.data;
        if (portalData?.user?.regNo) {
          const u = portalData.user;
          users.push({
            regNo: u.regNo,
            username: u.regNo,
            name: u.name || "Student",
            profileImgBase64: u.profileImgBase64 || "",
            lastActive: Date.now(),
            campus: u.campus || "vellore",
          });
        } else if (allData["retop_lastAuthId"]) {
          users.push({
            regNo: allData["retop_lastAuthId"],
            username: allData["retop-saved-username"] || allData["retop_lastAuthId"],
            name: allData["retop_lastName"] || "Student",
            profileImgBase64: allData["retop_profileImage"] || "",
            lastActive: Date.now(),
          });
        } else {
          // Scan for any cached user keys like "21BCE0001_dashboard_stats"
          for (const k of Object.keys(allData)) {
            const cleanKey = k.replace(/^retop_cache_/, "");
            const match = cleanKey.match(/^([A-Za-z0-9]{8,12})_/);
            if (match && match[1] && !match[1].toLowerCase().startsWith("retop")) {
              const reg = match[1];
              if (!users.some((u) => u.regNo.toLowerCase() === reg.toLowerCase())) {
                users.push({
                  regNo: reg,
                  username: reg,
                  name: "Student",
                  lastActive: Date.now(),
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn("[retop] Storage recovery scan failed", e);
      }
    }

    setUsersIndex(users);

    if (users.length === 0) {
      setStep("NO_CACHE");
    } else {
      const activeRegNo = (res.retop_active_user as string) || lastAuthId || users[0].regNo;
      const targetUser = users.find((u) => u.regNo === activeRegNo) || users[0];

      let isUnlocked = false;
      try {
        const unlockedRegNo = sessionStorage.getItem("retop_session_unlocked");
        if (unlockedRegNo && unlockedRegNo === targetUser.regNo) {
          isUnlocked = true;
        }
      } catch {}

      if (isUnlocked) {
        setActiveUser(targetUser);
        launchDashboard(targetUser);
      } else {
        selectUser(targetUser);
      }
    }
  };

  const selectUser = async (user: CachedUser) => {
    setActiveUser(user);
    setPinInput("");
    setPinError(false);
    setIsSettingPin(false);
    setPinSuccessMsg("");

    const record = await getUserPinRecord(user.regNo);
    const pinExists = Boolean(record);
    setHasPinSet(pinExists);

    if (!pinExists) {
      setIsSettingPin(true);
    }

    setStep("PIN_LOCK");
  };

  const handleUnlock = async (overridePin?: string) => {
    if (!activeUser) return;
    const pinToVerify = overridePin !== undefined ? overridePin : pinInput;

    if (!hasPinSet) {
      // If PIN is not set yet, require 4-digit PIN setup before unlocking
      if (pinToVerify.length === 4) {
        await saveUserPin(activeUser.regNo, pinToVerify);
        setHasPinSet(true);
      } else {
        setIsSettingPin(true);
        return;
      }
    } else {
      const isValid = await verifyUserPin(activeUser.regNo, pinToVerify);
      if (!isValid) {
        setPinError(true);
        setTimeout(() => setPinError(false), 600);
        return;
      }
    }

    try {
      sessionStorage.setItem("retop_session_unlocked", activeUser.regNo);
    } catch {}

    await setStorageData({
      retop_lastAuthId: activeUser.regNo,
      retop_lastName: activeUser.name,
      retop_profileImage: activeUser.profileImgBase64 || "",
      retop_active_user: activeUser.regNo,
    });

    launchDashboard(activeUser);
  };

  const handleSaveNewPin = async () => {
    if (!activeUser || newPin.length !== 4) return;
    await saveUserPin(activeUser.regNo, newPin);
    setHasPinSet(true);
    setIsSettingPin(false);
    setPinInput(newPin);
    setNewPin("");
    setPinSuccessMsg("Security PIN encrypted and saved successfully!");
    setTimeout(() => setPinSuccessMsg(""), 3000);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (json && typeof json === "object") {
        await setStorageData(json);
        window.location.reload();
      }
    } catch (err) {
      alert("Invalid backup file format.");
    }
  };

  const launchDashboard = (user: CachedUser) => {
    setStep("UNLOCKED");

    try {
      localStorage.setItem("retop_lastAuthId", user.regNo);
      if (user.name) localStorage.setItem("retop_lastName", user.name);
      if (user.profileImgBase64) localStorage.setItem("retop_profileImage", user.profileImgBase64);
      idbSet("retop_lastAuthId", user.regNo).catch(() => {});
      idbSet("retop_active_user", user.regNo).catch(() => {});
      if (user.profileImgBase64) idbSet(`${user.regNo}_profileImage`, user.profileImgBase64).catch(() => {});
    } catch (e) {}

    document.body.replaceChildren();

    const input = document.createElement("input");
    input.id = "authorizedIDX";
    input.value = user.regNo;
    document.body.appendChild(input);

    const header = document.createElement("div");
    header.className = "navbar-text text-light small fw-bold";
    header.textContent = `${user.regNo} (Offline) - ${user.name || "Offline"} )`;
    document.body.appendChild(header);

    if (user.profileImgBase64) {
      const img = document.createElement("img");
      img.id = "retop-profile-image-mock";
      img.src = user.profileImgBase64;
      img.style.display = "none";
      document.body.appendChild(img);
    }

    (window as any).csrfValue = "offline_csrf";
    (window as any).__RETOP_OFFLINE__ = true;

    renderDashboard();
  };

  if (step === "LOADING") {
    return (
      <div className="h-screen w-screen bg-[#09090b] flex flex-col items-center justify-center text-white" style={GSF}>
        <VitEmblemLoader size={72} className="text-(--accent-base)" />
      </div>
    );
  }

  if (step === "UNLOCKED") {
    return null;
  }

  return (
    <div className="min-h-screen w-screen bg-[#09090b] text-[#f8fafc] flex flex-col lg:flex-row overflow-x-hidden selection:bg-blue-600 selection:text-white" style={GSF}>
      {/* Left 50% Column: Form (.container-fluid / #loginBox) */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center items-center px-6 py-10 lg:px-16 z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Header matching login-theme.css .card-header h4 */}
          <div className="text-left space-y-1">
            <h1
              className="text-5xl font-black lowercase tracking-tighter text-white select-none inline-block cursor-default"
              style={{
                fontFamily: "'Google Sans Flex', system-ui, sans-serif",
                fontVariationSettings: '"wdth" 151, "wght" 800, "GRAD" 100, "ROND" 100, "slnt" -10',
                transition: "font-variation-settings 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.fontVariationSettings = '"wdth" 151, "wght" 1, "GRAD" 100, "ROND" 100, "slnt" -10';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.fontVariationSettings = '"wdth" 151, "wght" 800, "GRAD" 100, "ROND" 100, "slnt" -10';
              }}>
              retop
            </h1>
            <p className="text-slate-400 text-base font-medium" style={GSF}>offline access portal</p>
          </div>

          {step === "NO_CACHE" && (
            <div className="space-y-6">
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-white">No Saved Accounts</h3>
                <span className="text-xs text-blue-400 font-semibold">Action Required</span>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed">
                No saved accounts found, please login and come back later.
              </p>

              <div className="flex flex-col gap-3 pt-2">
                <a
                  href="https://vtop.vit.ac.in/vtop/login"
                  className="w-full h-10 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-full transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2">
                  Go to VTOP
                </a>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-full transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Import Backup File</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: PIN LOCK SCREEN & MULTI-USER SELECTOR */}
          {step === "PIN_LOCK" && activeUser && (
            <div className="space-y-5">
              {/* Account Switcher Dropdown */}
              <AccountDropdown
                users={usersIndex}
                activeUser={activeUser}
                onSelect={selectUser}
                onImport={() => fileInputRef.current?.click()} />

              {/* Input Group matching login-theme.css */}
              <div 
                className="space-y-4">
                {!isSettingPin ? (
                  <>
                    <PinBoxes
                      value={pinInput}
                      onChange={setPinInput}
                      onSubmit={(p) => handleUnlock(p)}
                      error={pinError} />

                    {pinError && (
                      <div className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2">
                        <ErrorIcon className="w-4 h-4 shrink-0" />
                        <span>Incorrect Security PIN. Please try again.</span>
                      </div>
                    )}

                    {pinSuccessMsg && (
                      <div className="text-emerald-400 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span>{pinSuccessMsg}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-start text-xs pt-1">
                      <button
                        onClick={() => setShowForgotPinModal(true)}
                        className="px-3.5 py-1.5 rounded-full bg-transparent hover:bg-[#18181b] border border-transparent hover:border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all cursor-pointer"
                        style={GSF}>
                        Forgot PIN?
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-[#18181b] border-2 border-slate-800 rounded-2xl p-4 space-y-3 text-center">
                    <h4 className="text-xs font-bold text-white flex items-center justify-center gap-2 uppercase tracking-wider">
                      <Key className="w-4 h-4 text-blue-400" />
                      <span>{hasPinSet ? "Update 4-Digit PIN" : "Setup 4-Digit Offline PIN"}</span>
                    </h4>
                    <p className="text-xs text-slate-400 text-left">
                      {hasPinSet
                        ? "Enter a new 4-digit PIN to update your offline encryption passcode."
                        : "Please create a 4-digit Security PIN to protect & access your offline data."}
                    </p>
                    <PinBoxes
                      value={newPin}
                      onChange={setNewPin}
                      onSubmit={handleSaveNewPin} />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSaveNewPin}
                        disabled={newPin.length !== 4}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-full transition-all cursor-pointer">
                        Save Encrypted PIN
                      </button>
                      {hasPinSet && (
                        <button
                          onClick={() => setIsSettingPin(false)}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-full border border-slate-700 transition-all cursor-pointer">
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
        </div>
      </div>

      {/* Right 50% Column: Hero Branding (#vtopOpenPageHeader) */}
      <div
        id="vtopOpenPageHeader"
        className="w-full lg:w-1/2 min-h-screen border-t lg:border-t-0 lg:border-l-3 border-slate-800 flex flex-col justify-center items-center p-8 relative overflow-hidden order-first lg:order-last z-10">
        <div className="relative z-10 text-center flex flex-col items-center max-w-sm w-full">
          <div className="mb-4 flex items-center justify-center p-2 overflow-visible">
            <VitEmblemLoader size={240} className="overflow-visible" />
          </div>
          <div
            className="text-[#f8fafc] text-base font-normal mt-1"
            style={{ fontFamily: "'Google Sans Flex', system-ui, sans-serif" }}>
            {activeUser?.campus === "chennai" ? "Chennai Campus" : "Vellore Campus"}
          </div>
        </div>
      </div>

      {/* Exact ASCII Art Wrapper matching login-theme.css */}
      <div
        id="retop-right-footer-wrapper"
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          pointerEvents: "none",
          zIndex: 1,
        }}>
        <AsciiPanel />
      </div>

      {/* Forgot PIN Confirmation Modal */}
      
        {showForgotPinModal && (
          <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div 
              className="bg-[#18181b] border-2 border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-left"
              style={GSF}>
              <div className="flex items-center gap-3 text-red-400">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-xl shrink-0 font-bold">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-snug">Forgot Security PIN?</h3>
                  <p className="text-xs text-red-400 font-semibold">Action is irreversible</p>
                </div>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed" style={GSF}>
                You cannot access your offline profile without your PIN. Resetting your PIN will clear all cached profile data on this device.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowForgotPinModal(false)}
                  className="px-4 py-2.5 rounded-full border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  style={GSF}>
                  Cancel
                </button>
                <button
                  onClick={handleResetCacheAndRedirect}
                  className="px-4 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                  style={GSF}>
                  Reset & Clear Cache
                </button>
              </div>
            </div>
          </div>
        )}
      <GlobalOverflowTooltip />
    </div>
  );
};

export const initializeOfflineMode = () => {
  const container = document.createElement("div");
  container.id = "offline-root";
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <OfflineApp />
    </ErrorBoundary>
  );
};

// Auto-initialize when loaded as a standalone script (injected by webBridge)
initializeOfflineMode();


