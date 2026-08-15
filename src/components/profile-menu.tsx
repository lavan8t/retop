import React, { useState } from "react";
import {
  AccountCircle,
  CreditCard,
  FilterNone,
  Key,
  ManageAccounts,
  Logout,
  Settings,
  Warning,
  Download,
  Upload,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { QuickLink } from "../types/vtop";
import { Tooltip } from "./ui/Tooltip";

interface ProfileMenuProps {
  userName: string;
  userRegNo: string;
  userProfileImg?: string;
  onNavigate: (link: QuickLink) => void;
  onLogout: () => void;
  onLegacyToggle: () => void;
  onClose: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  userName,
  userRegNo,
  userProfileImg,
  onNavigate,
  onLogout,
  onLegacyToggle,
  onClose,
}) => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleExportBackup = async () => {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        data[key] = localStorage.getItem(key);
      }
    }
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.get(null, (items) => {
          if (items) Object.assign(data, items);
          resolve();
        });
      });
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `retop_backup_${userRegNo || "data"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const mainItems = [
    {
      title: "Profile",
      targetTitle: "Student Profile All View",
      icon: AccountCircle,
      url: "studentsRecord/StudentProfileAllView",
      cat: "Profile",
    },
    {
      title: "Bank Info",
      targetTitle: "Student Bank Info",
      icon: CreditCard,
      url: "fees/StudentBankInfo",
      cat: "Profile",
    },
    {
      title: "Login ID",
      targetTitle: "Update Loginid",
      icon: ManageAccounts,
      url: "user/updateLoginId",
      cat: "Settings",
    },
    {
      title: "Password",
      targetTitle: "Change Password",
      icon: Key,
      url: "user/changePassword",
      cat: "Settings",
    },
    {
      title: "Backup Codes",
      targetTitle: "Backup Codes",
      icon: FilterNone,
      url: "user/backupCodes",
      cat: "Settings",
    },
  ];

  const [focusedIndex, setFocusedIndex] = useState(0);

  const isOffline = typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__;
  const bottomActionsCount = isOffline ? 4 : 3; // Settings, (VTOP or Export/Import), Logout
  const totalItems = mainItems.length + bottomActionsCount;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showLogoutDialog) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowLogoutDialog(false);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % totalItems);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (focusedIndex < mainItems.length) {
          const item = mainItems[focusedIndex];
          onNavigate({
            title: item.targetTitle || item.title,
            url: item.url,
            category: item.cat,
          });
          onClose();
        } else {
          const bottomIdx = focusedIndex - mainItems.length;
          if (bottomIdx === 0) {
            // Settings
            onNavigate({
              title: "Settings",
              url: "#settings",
              category: "System",
            });
            onClose();
          } else if (!isOffline && bottomIdx === 1) {
            // VTOP Toggle
            onLegacyToggle();
            onClose();
          } else if (isOffline && bottomIdx === 1) {
            // Export
            handleExportBackup();
          } else if (isOffline && bottomIdx === 2) {
            // Import
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";
            input.click();
          } else {
            // Logout
            setShowLogoutDialog(true);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showLogoutDialog, focusedIndex, totalItems, mainItems, onNavigate, onLegacyToggle, isOffline]);

  return (
    <div
      style={{ transformOrigin: "right top" }}
      className="absolute right-0 top-0 md:right-1 md:top-1 w-70 bg-transparent border-0 z-9999 flex flex-col p-3 transition-all duration-200 animate-popup-open"
    >
      <div className="flex-1 flex flex-col gap-2">
        {/* Profile Header */}
        <div className="flex flex-row items-center justify-between pl-4 py-0 pr-0 bg-(--bg-highlight) rounded-3xl overflow-hidden w-full border-2 border-(--border-dim) popup-shadow">
          <div className="flex flex-col overflow-hidden relative flex-1 mr-2 py-3">
            <div
              className={`text-sm font-bold text-(--text-main) uppercase whitespace-nowrap inline-block ${(userName !== "Student" ? userName : userRegNo).length > 18 ? "animate-[profile-marquee_6s_linear_infinite]" : "w-full text-left"}`}
              title={userName !== "Student" ? userName : userRegNo}
            >
              {userName !== "Student" ? userName : userRegNo}
            </div>
            {userName !== "Student" && (
              <div className="text-[10px] text-(--text-muted) uppercase font-bold mt-0.5 text-left">
                {userRegNo}
              </div>
            )}
          </div>
          <div className="w-16 h-full min-h-16 shadow-sm transition-all cursor-default bg-(--bg-main) shrink-0 z-9999 relative">
            {userRegNo !== "..." && userProfileImg ? (
              <img
                src={userProfileImg}
                className="w-full h-full object-cover"
                alt="Profile"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <AccountCircle className="w-8 h-8 text-(--text-dim)" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col bg-(--bg-surface) rounded-3xl overflow-hidden border-2 border-(--border-dim) popup-shadow">
          {mainItems.map((item, i) => {
            const isHighlighted = focusedIndex === i;
            return (
              <button
                key={i}
                onMouseEnter={() => setFocusedIndex(i)}
                onClick={() => {
                  onNavigate({
                    title: item.targetTitle || item.title,
                    url: item.url,
                    category: item.cat,
                  });
                  onClose();
                }}
                className={`flex w-full items-center justify-start px-4 py-3 transition-colors group text-(--text-main) cursor-pointer outline-none
                  ${isHighlighted ? "bg-(--bg-highlight)" : "bg-(--bg-surface) hover:bg-(--bg-highlight)"}
                  ${i !== mainItems.length - 1 ? "border-b-2 border-(--border-dim)" : ""}
                `}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 transition-colors shrink-0 ${isHighlighted ? "text-(--accent-base)" : "text-(--text-muted) group-hover:text-(--text-main)"}`} />
                  <span className="text-xs font-bold text-left transition-colors text-(--text-main)">
                    {item.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-1.5 bg-(--bg-surface) rounded-3xl border-2 border-(--border-dim) p-1.5 shrink-0 popup-shadow">
        <Tooltip text="Settings" className="flex-1">
          <button
            onMouseEnter={() => setFocusedIndex(mainItems.length)}
            onClick={() => {
              onNavigate({
                title: "Settings",
                url: "#settings",
                category: "System",
              });
              onClose();
            }}
            className={`w-full flex items-center justify-center p-2.5 rounded-[18px] transition-colors active:scale-95 group outline-none ${
              focusedIndex === mainItems.length
                ? "bg-(--accent-base) text-(--text-inverse)"
                : "bg-(--bg-highlight) text-(--text-main) hover:text-(--accent-base)"
            }`}
          >
            <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform duration-700 ease-out" />
          </button>
        </Tooltip>

        {!(typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__) && (
          <Tooltip text="Get back to VTOP" className="flex-1">
            <button
              onMouseEnter={() => setFocusedIndex(mainItems.length + 1)}
              onClick={() => {
                onLegacyToggle();
                onClose();
              }}
              className={`w-full flex items-center justify-center p-2.5 rounded-[18px] transition-colors active:scale-95 group outline-none ${
                focusedIndex === mainItems.length + 1
                  ? "bg-(--accent-base) text-(--text-inverse)"
                  : "bg-(--bg-highlight) text-(--text-main) hover:text-(--accent-base)"
              }`}
            >
              <span className="text-md group-hover:scale-110 transition-transform font-['Times_New_Roman',Times,serif]! font-bold">
                VTOP
              </span>
            </button>
          </Tooltip>
        )}

        {(typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__) && (
          <>
            <Tooltip text="Export Backup" className="flex-1">
              <button
                onMouseEnter={() => setFocusedIndex(mainItems.length + 1)}
                onClick={handleExportBackup}
                className={`w-full flex items-center justify-center p-2.5 rounded-[18px] transition-colors active:scale-95 group cursor-pointer outline-none ${
                  focusedIndex === mainItems.length + 1
                    ? "bg-(--accent-base) text-(--text-inverse)"
                    : "bg-(--bg-highlight) text-(--text-main) hover:text-(--accent-base)"
                }`}
              >
                <Download className="w-6 h-6 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </Tooltip>
            <Tooltip text="Import Backup" className="flex-1">
              <button
                onMouseEnter={() => setFocusedIndex(mainItems.length + 2)}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".json";
                  input.onchange = async (e: any) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const json = JSON.parse(text);
                      if (json && typeof json === "object") {
                        for (const [k, v] of Object.entries(json)) {
                          localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
                        }
                        if (typeof chrome !== "undefined" && chrome.storage?.local) {
                          chrome.storage.local.set(json);
                        }
                        window.location.reload();
                      }
                    } catch {
                      alert("Invalid backup file");
                    }
                  };
                  input.click();
                }}
                className={`w-full flex items-center justify-center p-2.5 rounded-[18px] transition-colors active:scale-95 group cursor-pointer outline-none ${
                  focusedIndex === mainItems.length + 2
                    ? "bg-(--accent-base) text-(--text-inverse)"
                    : "bg-(--bg-highlight) text-(--text-main) hover:text-(--accent-base)"
                }`}
              >
                <Upload className="w-6 h-6 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </Tooltip>
          </>
        )}

        <Tooltip text="Log Out" className="flex-1">
          <button
            onMouseEnter={() => setFocusedIndex(totalItems - 1)}
            onClick={() => setShowLogoutDialog(true)}
            className={`w-full flex items-center justify-center p-2.5 rounded-[18px] transition-colors active:scale-95 group outline-none ${
              focusedIndex === totalItems - 1
                ? "bg-(--accent-base) text-(--text-inverse)"
                : "bg-(--bg-highlight) text-(--text-main) hover:text-(--accent-base)"
            }`}
          >
            <Logout className="w-6 h-6 group-hover:translate-x-1.5 transition-transform duration-500 ease-out" />
          </button>
        </Tooltip>
      </div>

      {showLogoutDialog && (
          <div
            className="absolute inset-0 z-50 bg-(--bg-main)/95 flex flex-col items-center justify-center p-4 text-center rounded-4xl transition-opacity duration-200"
          >
            <Warning className="w-12 h-12 text-att-danger mb-3" />
            <h3 className="text-xl font-black font-expanded text-(--text-main) uppercase mb-1">
              Log Out?
            </h3>
            <p className="text-xs font-bold text-(--text-muted) mb-6">
              Are you sure you want to exit?
            </p>
            <div className="flex gap-2 w-full max-w-50">
              <button
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 py-2.5 bg-(--bg-highlight) text-(--text-main) font-bold rounded-xl hover:bg-(--border-dim) transition-colors text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-2.5 bg-att-danger text-content-inverse font-bold rounded-xl hover:bg-att-danger transition-colors text-sm cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        )}
    </div>
  );
};
