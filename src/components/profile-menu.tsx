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
      title: "Login ID",
      icon: ManageAccounts,
      url: "user/updateLoginId",
      cat: "Settings",
    },
    {
      title: "Password",
      icon: Key,
      url: "user/changePassword",
      cat: "Settings",
    },
    {
      title: "Backup Codes",
      icon: FilterNone,
      url: "user/backupCodes",
      cat: "Settings",
    },
  ];

  const iosSpring: Transition = {
    type: "spring",
    stiffness: 900,
    damping: 30,
    mass: 0.6,
  };

  const menuVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9, y: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", stiffness: 1200, damping: 40 },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: -10,
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
      className="absolute right-0 top-0 md:right-1 md:top-1 w-[17.5rem] bg-transparent border-0 z-[9999] origin-top-right flex flex-col will-change-transform transform-gpu p-3"
    >
      <div className="flex-1 flex flex-col gap-2">
        {/* Profile Header */}
        <div className="flex flex-row items-center justify-between pl-4 py-0 pr-0 bg-(--bg-highlight) rounded-[24px] overflow-hidden w-full border-2 border-(--border-dim) popup-shadow">
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
          <div className="w-16 h-full min-h-[64px] shadow-sm transition-all cursor-default bg-(--bg-main) shrink-0 z-9999 relative">
            {userRegNo !== "..." && userRegNo ? (
              <img
                src={userProfileImg || `/vtop/users/image/?id=${userRegNo}`}
                className="w-full h-full object-cover"
                alt="Profile"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <AccountCircle className="w-8 h-8 text-(--text-dim)" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col bg-(--bg-surface) rounded-[24px] overflow-hidden border-2 border-(--border-dim) popup-shadow">
          {mainItems.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                onNavigate({
                  title: item.title,
                  url: item.url,
                  category: item.cat,
                });
                onClose();
              }}
              className={`flex w-full items-center justify-start px-4 py-3 bg-(--bg-surface) hover:bg-(--bg-highlight) transition-colors group text-(--text-main)
                ${i !== mainItems.length - 1 ? "border-b-2 border-(--border-dim)" : ""}
              `}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 transition-colors text-(--text-muted) group-hover:text-(--text-main) shrink-0" />
                <span className="text-xs font-bold text-left transition-colors text-(--text-main)">
                  {item.title}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 bg-(--bg-surface) rounded-3xl border-2 border-(--border-dim) p-1.5 shrink-0 popup-shadow">
        <Tooltip text="Settings" className="flex-1">
          <button
            onClick={() => {
              onNavigate({
                title: "Settings",
                url: "#settings",
                category: "System",
              });
              onClose();
            }}
            className="w-full flex items-center justify-center p-2.5 rounded-[18px] bg-(--bg-highlight) text-(--text-main) hover:text-(--accent-base) transition-colors active:scale-95 group"
          >
            <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform duration-700 ease-out" />
          </button>
        </Tooltip>

        <Tooltip text="Get back to VTOP" className="flex-1">
          <button
            onClick={() => {
              onLegacyToggle();
              onClose();
            }}
            className="w-full flex items-center justify-center p-2.5 rounded-[18px] bg-(--bg-highlight) text-(--text-main) hover:text-(--accent-base) transition-colors active:scale-95 group"
          >
            <span className="text-md group-hover:scale-110 transition-transform font-['Times_New_Roman',Times,serif]! font-bold">
              VTOP
            </span>
          </button>
        </Tooltip>

        <Tooltip text="Log Out" className="flex-1">
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="w-full flex items-center justify-center p-2.5 rounded-[18px] bg-(--bg-highlight) text-(--text-main) hover:text-(--accent-base) transition-colors active:scale-95 group"
          >
            <Logout className="w-6 h-6 group-hover:translate-x-1.5 transition-transform duration-500 ease-out" />
          </button>
        </Tooltip>
      </div>

      <AnimatePresence>
        {showLogoutDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-(--bg-main)/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center rounded-4xl"
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
