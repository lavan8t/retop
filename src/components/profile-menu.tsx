import React, { useState } from "react";
import {
  AccountCircle,
  CreditCard,
  FilterNone,
  Key,
  ManageAccounts,
  Logout,
  Settings,
  ChevronRight,
  DesignServices,
  Warning,
  SwapHoriz,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { QuickLink } from "../types/vtop";
import { motion, Variants, Transition, AnimatePresence } from "framer-motion";

interface ProfileMenuProps {
  userName: string;
  userRegNo: string;
  onNavigate: (link: QuickLink) => void;
  onLogout: () => void;
  onLegacyToggle: () => void;
  onClose: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  userName,
  userRegNo,
  onNavigate,
  onLogout,
  onLegacyToggle,
  onClose,
}) => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const mainItems = [
    {
      title: "Profile",
      icon: AccountCircle,
      url: "studentsRecord/StudentProfileAllView",
      cat: "Profile",
    },
    {
      title: "Bank Info",
      icon: CreditCard,
      url: "fees/StudentBankInfo",
      cat: "Profile",
    },
    {
      title: "Backup Codes",
      icon: FilterNone,
      url: "user/backupCodes",
      cat: "Settings",
    },
  ];

  const editItems = [
    {
      title: "Password",
      icon: Key,
      url: "user/changePassword",
      cat: "Settings",
      hoverClass:
        "hover:bg-(--accent-base) hover:text-white hover:border-(--accent-base)",
    },
    {
      title: "Login ID",
      icon: ManageAccounts,
      url: "user/updateLoginId",
      cat: "Settings",
      hoverClass:
        "hover:bg-(--accent-base) hover:text-white hover:border-(--accent-base)",
    },
  ];

  const iosSpring: Transition = {
    type: "spring",
    stiffness: 900,
    damping: 30,
    mass: 0.6,
  };

  const menuVariants: Variants = {
    hidden: { opacity: 0, scale: 0.4, y: -20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", stiffness: 1200, damping: 40 },
    },
    exit: {
      opacity: 0,
      scale: 0.4,
      y: -20,
      transition: { type: "spring", stiffness: 1200, damping: 40 },
    },
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      variants={menuVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute right-2 top-2 md:right-4 md:top-4 w-64 bg-(--bg-surface) rounded-[32px] shadow-[var(--brutal-shadow-lg)] z-[9999] overflow-hidden origin-top-right flex flex-col will-change-transform transform-gpu popup-shadow"
    >
      <div className="overflow-y-auto custom-scrollbar p-2 flex-1">
        {/* Profile Header */}
        <div className="flex flex-col items-center justify-center p-4 mb-2 border-b-2 border-(--border-dim) overflow-hidden w-full">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-(--border-main) shadow-sm transition-all mb-3 cursor-default bg-(--bg-highlight) shrink-0 z-9999">
            {userRegNo !== "..." && userRegNo ? (
              <img
                src={`/vtop/users/image/?id=${userRegNo}`}
                className="w-full h-full object-cover"
                alt="Profile"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <AccountCircle className="w-8 h-8 text-(--text-dim)" />
              </div>
            )}
          </div>
          <div
            className="w-full overflow-hidden relative"
            title={userName !== "Student" ? userName : userRegNo}
          >
            <div
              className={`text-sm font-bold text-(--text-main) uppercase whitespace-nowrap inline-block ${(userName !== "Student" ? userName : userRegNo).length > 18 ? "animate-[profile-marquee_6s_linear_infinite]" : "w-full text-center"}`}
            >
              {userName !== "Student" ? userName : userRegNo}
            </div>
          </div>
          {userName !== "Student" && (
            <div className="text-[10px] text-(--text-muted) uppercase font-bold mt-0.5 text-center">
              {userRegNo}
            </div>
          )}
        </div>

        <div className="space-y-1 mb-1">
          {mainItems.map((item, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                onNavigate({
                  title: item.title,
                  url: item.url,
                  category: item.cat,
                });
                onClose();
              }}
              className="flex w-full items-center justify-between px-3 py-2 rounded-2xl border-4 transition-all group border-transparent hover:bg-(--accent-base) hover:border-(--border-main) hover:shadow-none hover:-translate-y-px text-(--text-main) hover:text-(--text-inverse)"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 transition-colors text-(--text-muted) group-hover:text-(--text-inverse) shrink-0" />
                <span className="text-xs font-bold text-left transition-colors text-(--text-main) group-hover:text-(--text-inverse)">
                  {item.title}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-(--text-main) group-hover:text-(--text-inverse)" />
            </motion.button>
          ))}
        </div>

        <div className="pt-4 mt-2 border-t-2 border-(--border-dim) mb-1">
          <div className="flex items-center gap-2 px-1.5 mb-2.5">
            <DesignServices className="w-3 h-3 text-(--text-dim)" />
            <span className="text-[9px] font-expanded font-black uppercase  text-(--text-dim)">
              Security
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {editItems.map((item, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onNavigate({
                    title: item.title,
                    url: item.url,
                    category: item.cat,
                  });
                  onClose();
                }}
                className={`flex flex-col items-center justify-center py-2.5 rounded-xl border-2 border-transparent bg-(--bg-highlight) hover:-translate-y-0.5 transition-all group ${item.hoverClass}`}
              >
                <item.icon className="w-4 h-4 mb-1 transition-transform group-hover:scale-110 text-inherit" />
                <span className="font-expanded font-black text-[8px] uppercase text-center text-inherit">
                  {item.title}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-2 flex gap-1.5 bg-(--bg-main) border-t-2 border-(--border-dim) shrink-0">
        <button
          onClick={() => {
            onNavigate({
              title: "Settings",
              url: "#settings",
              category: "System",
            });
            onClose();
          }}
          className="flex-1 flex items-center justify-center p-2.5 rounded-tl-md rounded-tr-[4px] rounded-bl-[24px] rounded-br-[4px] bg-(--bg-highlight) text-(--text-main) hover:bg-(--accent-base) hover:text-white transition-colors active:scale-95 group"
          title="Settings"
        >
          <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
        </button>

        <button
          onClick={() => {
            onLegacyToggle();
            onClose();
          }}
          className="flex-1 flex items-center justify-center p-2.5 rounded-md text-white hover:brightness-110 transition-all active:scale-95 group"
          style={{
            background:
              "linear-gradient(130deg, var(--accent-hover) 23%, var(--accent-base) 52%, var(--md-sys-color-primary) 58%, var(--accent-base) 65%, var(--accent-active) 74%)",
          }}
          title="Legacy View"
        >
          <span className="text-md group-hover:scale-110 transition-transform font-['Times_New_Roman',Times,serif]! font-bold! text-white!">
            VIT
          </span>
        </button>

        <button
          onClick={() => setShowLogoutDialog(true)}
          className="flex-1 flex items-center justify-center p-2.5 rounded-tr-md rounded-tl-[4px] rounded-br-[24px] rounded-bl-[4px] bg-(--bg-highlight) text-red-500 hover:text-white hover:bg-red-500 transition-colors active:scale-95 group"
          title="Log Out"
        >
          <Logout className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </div>

      <AnimatePresence>
        {showLogoutDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-(--bg-main)/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center rounded-4xl"
          >
            <Warning className="w-12 h-12 text-red-500 mb-3" />
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
                className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors text-sm cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
