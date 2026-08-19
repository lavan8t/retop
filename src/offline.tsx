import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  AccountCircle,
  Add,
  Upload,
  Key,
  CheckCircle,
  Check,
  KeyboardArrowDown,
  Error as ErrorIcon,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { renderDashboard } from "./pages/app";
import { getStorageData, setStorageData } from "./utils/storageAdapter";
import { getUserPinRecord, saveUserPin, verifyUserPin, getUserProfileImage } from "./utils/pinSecurity";
import { AsciiPanel } from "./components/asciiArt";
import { applyTheme } from "./utils/settings-store";
import { VitLogo } from "./components/VitLogo";
import { VitEmblemLoader } from "./components/common/VitEmblemLoader";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { fixBase64Image } from "./parsers/profile";
import { clear as idbClear, set as idbSet } from "idb-keyval";
import { AlertDialogManager, showAlertDialog } from "./components/ui/AlertDialog";

const GSF: React.CSSProperties = {
  fontFamily: "'Google Sans Flex', system-ui, sans-serif",
};

export const cleanUserString = (str?: string) => {
  if (!str) return "";
  return str.replace(/\s*\(offline\)/gi, "").replace(/\)+$/, "").trim();
};

export interface CachedUser {
  regNo: string;
  username?: string;
  name: string;
  profileImgBase64?: string;
  lastActive: number;
  campus?: "vellore" | "chennai";
}

/* ── Account Switcher Dropdown (retop custom dropdown style) ─────────────── */
interface AccountDropdownProps {
  users: CachedUser[];
  activeUser: CachedUser;
  onSelect: (u: CachedUser) => void;
  onImport: () => void;
}

const AccountDropdown: React.FC<AccountDropdownProps> = ({ users, activeUser, onSelect, onImport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeLabel = cleanUserString(activeUser.username) || cleanUserString(activeUser.regNo);

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
    <div ref={containerRef} className="relative w-full max-w-[320px] mx-auto">
      {/* Trigger button — solid fill bg, no border, higher padding */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 bg-[#18181b] hover:bg-[#222226] rounded-full px-5 py-3.5 sm:px-6 sm:py-4 transition-all cursor-pointer group shadow-lg border-0"
        style={GSF}>
        <div className="flex items-center gap-3 min-w-0">
          {fixBase64Image(activeUser.profileImgBase64) ? (
            <img src={fixBase64Image(activeUser.profileImgBase64)} alt={activeLabel} className="w-6 h-6 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
              <AccountCircle className="w-4 h-4" />
            </div>
          )}
          <span className="text-xs sm:text-sm font-bold text-white leading-none truncate">{activeLabel}</span>
        </div>
        <KeyboardArrowDown
          className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: "var(--accent-base, #60a5fa)" }}
        />
      </button>

      {/* Dropdown menu — solid fill bg, no border, higher padding, shadow-2xl */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 top-full pt-2 animate-in fade-in slide-in-from-top-1 duration-150"
          style={{ willChange: "transform, opacity" }}>
          <div className="w-full bg-[#18181b] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2 space-y-1.5 border-0">
            <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar p-1">
              {users.map((u) => {
                const isSelected = u.regNo.toLowerCase() === activeUser.regNo.toLowerCase();
                const itemLabel = cleanUserString(u.username) || cleanUserString(u.regNo);
                return (
                  <button
                    key={u.regNo}
                    type="button"
                    onClick={() => { onSelect(u); setIsOpen(false); }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl transition-all cursor-pointer text-left ${
                      isSelected
                        ? "text-white font-bold shadow-md"
                        : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                    }`}
                    style={{
                      backgroundColor: isSelected ? "var(--accent-base, #2563eb)" : undefined,
                    }}>
                    <div className="flex items-center gap-3 min-w-0">
                      {fixBase64Image(u.profileImgBase64) ? (
                        <img src={fixBase64Image(u.profileImgBase64)} alt={itemLabel} className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-zinc-300 shrink-0">
                          <AccountCircle className="w-4 h-4" />
                        </div>
                      )}
                      <span className="text-xs sm:text-sm truncate">{itemLabel}</span>
                    </div>
                    {isSelected && <Check className="w-5 h-5 shrink-0 text-white" />}
                  </button>
                );
              })}
            </div>
            {/* Import option as footer */}
            <div className="border-t border-zinc-800/80 pt-1.5 mt-1">
              <button
                type="button"
                onClick={() => { onImport(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-all cursor-pointer text-xs font-bold text-left"
                style={GSF}>
                <Add className="w-5 h-5 shrink-0" style={{ color: "var(--accent-base, #60a5fa)" }} />
                <span>Import backup JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Emblem Star Vector Component ────────────────────────────────────── */
export const EmblemStar: React.FC<{ type?: "left" | "right"; className?: string; style?: React.CSSProperties }> = ({
  type = "left",
  className = "w-9 h-9",
  style,
}) => {
  if (type === "right") {
    return (
      <svg
        viewBox="112 110.8 10 9"
        fill="currentColor"
        className={className}
        style={style}
      >
        <polygon
          points="116.91,117.121 113.45,118.501 114.95,115.311 113.45,112.111 116.91,113.501 120.359,112.111 118.87,115.311 120.359,118.501"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="20 110.8 10 9"
      fill="currentColor"
      className={className}
      style={style}
    >
      <polygon
        points="24.61,117.121 21.15,118.501 22.66,115.311 21.15,112.111 24.61,113.501 28.07,112.111 26.58,115.311 28.07,118.501"
      />
    </svg>
  );
};

/* ── Star-Based PIN Input Component ───────────────────────────────────── */
interface StarPinInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: (pinVal?: string) => void;
  error?: boolean;
  prompt?: string;
  autoFocus?: boolean;
  maxDigits?: number;
}

const StarPinInput: React.FC<StarPinInputProps> = ({
  value,
  onChange,
  onSubmit,
  error = false,
  prompt = "Enter your PIN",
  autoFocus = true,
  maxDigits = 10,
}) => {
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      hiddenInputRef.current?.focus();
    }

    const onGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && activeEl !== hiddenInputRef.current && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        if (value.length < maxDigits) {
          const newVal = value + e.key;
          onChange(newVal);
          if (onSubmit) {
            onSubmit(newVal);
          }
        }
      } else if (e.key === "Backspace") {
        e.preventDefault();
        onChange(value.slice(0, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (value.length >= 4 && onSubmit) {
          onSubmit(value);
        }
      }
    };

    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, [value, onChange, onSubmit, autoFocus, maxDigits]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, maxDigits);
    onChange(raw);
    if (onSubmit) {
      onSubmit(raw);
    }
  };

  const handleContainerClick = () => {
    hiddenInputRef.current?.focus();
  };

  return (
    <div
      onClick={handleContainerClick}
      className={`relative w-full py-10 px-4 sm:px-6 flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-200 min-h-32.5 ${
        error ? "animate-pin-shake" : ""
      }`}
    >
      {/* Hidden input for mobile keyboard support and accessibility */}
      <input
        ref={hiddenInputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={maxDigits}
        value={value}
        onChange={handleInputChange}
        className="sr-only opacity-0 absolute pointer-events-none"
        aria-label="PIN input"
        autoFocus={autoFocus}
      />

      {value.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1.5 animate-in fade-in duration-200">
          <p className="text-base sm:text-lg font-bold text-zinc-400 tracking-wide uppercase">
            {prompt}
          </p>
          <span className="text-[11px] text-zinc-500 font-medium font-sans">
            Type 4–10 digit PIN to unlock
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3.5 sm:gap-5 flex-wrap max-w-full transition-all duration-300 ease-out">
          {Array.from({ length: value.length }).map((_, idx) => {
            const isLeft = idx % 2 === 0;
            return (
              <div
                key={idx}
                className="star-pin-slot animate-star-pin"
              >
                <EmblemStar
                  type={isLeft ? "left" : "right"}
                  className="w-8 h-8 sm:w-10 sm:h-10 transition-colors duration-150"
                  style={{
                    color: error ? "#ef4444" : "var(--accent-base, #60a5fa)",
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";



const OfflineApp = () => {
  const [step, setStep] = useState<"LOADING" | "NO_CACHE" | "PIN_LOCK" | "UNLOCKED">("LOADING");
  const [loaderFinishing, setLoaderFinishing] = useState<boolean>(false);
  const [loaderFading, setLoaderFading] = useState<boolean>(false);
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

    // Sanitize and deduplicate cached users by clean registration number
    const cleanUsersMap = new Map<string, CachedUser>();
    for (const rawUser of users) {
      const regNo = cleanUserString(rawUser.regNo);
      if (!regNo) continue;
      const key = regNo.toUpperCase();
      const existing = cleanUsersMap.get(key);
      const username = cleanUserString(rawUser.username) || regNo;
      const name = cleanUserString(rawUser.name) || existing?.name || "Student";
      let rawImg = rawUser.profileImgBase64 || existing?.profileImgBase64 || "";
      if (!rawImg || !rawImg.startsWith("data:image")) {
        try {
          const stored = await getUserProfileImage(regNo);
          if (stored) rawImg = stored;
        } catch {}
      }
      const profileImgBase64 = fixBase64Image(rawImg);
      const lastActive = Math.max(rawUser.lastActive || 0, existing?.lastActive || 0);

      cleanUsersMap.set(key, {
        regNo,
        username,
        name,
        profileImgBase64,
        lastActive,
      });
    }
    users = Array.from(cleanUsersMap.values());
    if (users.length > 0) {
      idbSet("retop_cached_users", users).catch(() => {});
    }

    setUsersIndex(users);

    const finishLoading = (onComplete: () => void) => {
      setLoaderFinishing(true);
      setTimeout(() => {
        setLoaderFading(true);
        setTimeout(() => {
          onComplete();
        }, 50);
      }, 150);
    };

    if (users.length === 0) {
      finishLoading(() => setStep("NO_CACHE"));
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
        finishLoading(() => launchDashboard(targetUser));
      } else {
        finishLoading(() => selectUser(targetUser));
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
    if (!pinToVerify || pinToVerify.length < 4) return;

    if (!hasPinSet) {
      // If PIN is not set yet, require 4-10 digit PIN setup before unlocking
      if (pinToVerify.length >= 4 && pinToVerify.length <= 10) {
        await saveUserPin(activeUser.regNo, pinToVerify);
        setHasPinSet(true);
      } else {
        setIsSettingPin(true);
        return;
      }
    } else {
      const isValid = await verifyUserPin(activeUser.regNo, pinToVerify);
      if (!isValid) {
        if (pinToVerify.length >= 10 || overridePin === undefined) {
          setPinError(true);
          setTimeout(() => setPinError(false), 600);
        }
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
    if (!activeUser || newPin.length < 4 || newPin.length > 10) return;
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
      showAlertDialog({
        title: "Import Error",
        message: "Invalid backup file format.",
      });
    }
  };

  const launchDashboard = (user: CachedUser) => {
    setStep("UNLOCKED");

    try {
      const safeImg = fixBase64Image(user.profileImgBase64);
      localStorage.setItem("retop_lastAuthId", user.regNo);
      localStorage.setItem("retop_active_user", user.regNo);
      if (user.name) localStorage.setItem("retop_lastName", user.name);
      if (safeImg) {
        localStorage.setItem(`${user.regNo}_profileImage`, safeImg);
      }
      setStorageData({
        retop_lastAuthId: user.regNo,
        retop_active_user: user.regNo,
        retop_lastName: user.name || "Student",
        [`${user.regNo}_profileImage`]: safeImg || "",
        [`${user.regNo}_user_basic_profile`]: {
          name: user.name || "Student",
          regNo: user.regNo,
          profileImgBase64: safeImg || "",
          campus: user.campus || "vellore",
        },
      });
    } catch (e) {}

    document.body.replaceChildren();

    const input = document.createElement("input");
    input.id = "authorizedIDX";
    input.value = user.regNo;
    document.body.appendChild(input);

    const header = document.createElement("div");
    header.className = "navbar-text text-light small fw-bold";
    header.textContent = `${user.regNo} - ${user.name || "Student"}`;
    document.body.appendChild(header);

    const safeImg = fixBase64Image(user.profileImgBase64);
    if (
      safeImg &&
      safeImg.length > 50 &&
      !safeImg.endsWith("base64,")
    ) {
      const img = document.createElement("img");
      img.id = "retop-profile-image-mock";
      img.src = safeImg;
      img.style.display = "none";
      document.body.appendChild(img);
    }

    (window as any).csrfValue = "offline_csrf";
    (window as any).__RETOP_OFFLINE__ = true;

    renderDashboard();
  };

  if (step === "LOADING") {
    return (
      <div
        className="h-screen w-screen bg-[#09090b] flex flex-col items-center justify-center text-white transition-opacity duration-50 ease-out"
        style={{
          ...GSF,
          opacity: loaderFading ? 0 : 1,
        }}
      >
        <VitEmblemLoader size={210} className="text-(--accent-base)" finishing={loaderFinishing} />
      </div>
    );
  }

  if (step === "UNLOCKED") {
    return null;
  }

  return (
    <div className="min-h-screen w-screen bg-[#09090b] text-[#f8fafc] flex flex-col lg:flex-row overflow-x-hidden selection:bg-blue-600 selection:text-white" style={GSF}>
      {/* Left 50% Column: Form (.container-fluid / #loginBox) */}
      <div className="w-full lg:w-1/2 min-h-[55vh] lg:min-h-screen flex flex-col justify-center items-center px-4 py-8 sm:px-8 lg:px-16 z-10">
        <div className="w-full max-w-md space-y-6 mx-auto">
          {/* Header matching login-theme.css .card-header h4 */}
          <div className="text-left space-y-1">
            <h1
              className="text-4xl sm:text-5xl font-black lowercase tracking-tighter text-white select-none inline-block cursor-default"
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
            <p className="text-slate-400 text-sm sm:text-base font-medium" style={GSF}>offline access portal</p>
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
                  className="w-full h-11 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-full transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2">
                  Go to <span className="font-vtop font-bold ml-1">VTOP</span>
                </a>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-11 text-white font-bold text-xs rounded-full transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2 hover:brightness-110"
                  style={{ backgroundColor: "var(--accent-base, #2563eb)" }}>
                  <Upload className="w-4 h-4" />
                  <span>Import Backup File</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: PIN LOCK SCREEN & MULTI-USER SELECTOR */}
          {step === "PIN_LOCK" && activeUser && (
            <div className="space-y-6">
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
                    <StarPinInput
                      value={pinInput}
                      onChange={setPinInput}
                      onSubmit={(p) => handleUnlock(p)}
                      error={pinError}
                      prompt="Enter your PIN" />

                    {pinError && (
                      <div className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 p-3 rounded-2xl flex items-center justify-center gap-2 text-center animate-in fade-in duration-150">
                        <ErrorIcon className="w-4 h-4 shrink-0" />
                        <span>Incorrect Security PIN. Please try again.</span>
                      </div>
                    )}

                    {pinSuccessMsg && (
                      <div className="text-emerald-400 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl flex items-center justify-center gap-2 text-center animate-in fade-in duration-150">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span>{pinSuccessMsg}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-center text-xs pt-1">
                      <button
                        onClick={() => setShowForgotPinModal(true)}
                        className="px-5 py-2 rounded-full bg-transparent hover:bg-[#18181b] border border-transparent hover:border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-all cursor-pointer"
                        style={GSF}>
                        Forgot PIN?
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-[#18181b] rounded-3xl p-6 space-y-4 text-center border-0 shadow-2xl">
                    <h4 className="text-xs font-bold text-white flex items-center justify-center gap-2 uppercase tracking-wider">
                      <Key className="w-4 h-4" style={{ color: "var(--accent-base, #60a5fa)" }} />
                      <span>{hasPinSet ? "Update Security PIN" : "Setup Offline PIN"}</span>
                    </h4>
                    <p className="text-xs text-zinc-400 text-center">
                      {hasPinSet
                        ? "Enter a new 4–10 digit PIN to update your offline encryption passcode."
                        : "Please create a 4–10 digit Security PIN to protect & access your offline data."}
                    </p>
                    <StarPinInput
                      value={newPin}
                      onChange={setNewPin}
                      onSubmit={handleSaveNewPin}
                      prompt={hasPinSet ? "Enter new PIN" : "Create PIN"} />
                    <div className="flex gap-2.5 pt-1">
                      <button
                        onClick={handleSaveNewPin}
                        disabled={newPin.length < 4 || newPin.length > 10}
                        className="flex-1 text-white font-bold text-xs py-3 rounded-full transition-all cursor-pointer hover:brightness-110 disabled:opacity-50"
                        style={{ backgroundColor: "var(--accent-base, #2563eb)" }}>
                        Save Encrypted PIN
                      </button>
                      {hasPinSet && (
                        <button
                          onClick={() => setIsSettingPin(false)}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs py-3 rounded-full transition-all cursor-pointer border-0">
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
        className="w-full lg:w-1/2 min-h-55 lg:min-h-screen border-b lg:border-b-0 lg:border-l border-zinc-800/80 flex flex-col justify-center items-center py-10 px-6 sm:px-12 relative overflow-hidden order-first lg:order-last z-10 shrink-0">
        <div className="relative z-10 text-center flex flex-col items-center max-w-sm w-full">
          <div className="mb-3 flex items-center justify-center p-2 text-white">
            <VitLogo
              className="h-16 sm:h-20 md:h-24 w-auto max-w-65 sm:max-w-85 text-white drop-shadow-md"
            />
          </div>
          <div
            className="text-[#f8fafc] text-sm sm:text-base tracking-[0.15em] mt-2 uppercase font-bold"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            {activeUser?.campus === "chennai" ? "CHENNAI CAMPUS" : "VELLORE CAMPUS"}
          </div>
        </div>
      </div>

      {/* Exact ASCII Art Wrapper matching login-theme.css */}
      <div
        id="retop-right-footer-wrapper"
        className="hidden lg:flex"
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          width: "100vw",
          height: "100vh",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          pointerEvents: "none",
          zIndex: 1,
        }}>
        <AsciiPanel campus={activeUser?.campus} />
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
      <AlertDialogManager />
    </div>
  );
};

export const initializeOfflineMode = () => {
  const container = document.createElement("div");
  container.id = "offline-root";
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    <ErrorBoundary variant="fullscreen" name="retop Offline">
      <OfflineApp />
    </ErrorBoundary>
  );
};

// Auto-initialize when loaded as a standalone script (injected by webBridge)
initializeOfflineMode();


