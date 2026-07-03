import React from "react";
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
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { QuickLink } from "../types/vtop";
import { motion, Variants, Transition } from "framer-motion";

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
        "hover:bg-pink-400 hover:shadow-[6px_6px_0px_0px_var(--shadow-main)]",
    },
    {
      title: "Login ID",
      icon: ManageAccounts,
      url: "user/updateLoginId",
      cat: "Settings",
      hoverClass:
        "hover:bg-blue-400 hover:shadow-[6px_6px_0px_0px_var(--shadow-main)]",
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

  return (
    <motion.div
      variants={menuVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute right-2 top-2 md:right-4 md:top-4 w-64 bg-(--bg-surface) border-4 border-(--border-main) rounded-4xl shadow-[6px_6px_0px_0px_var(--shadow-main)] z-9999 overflow-hidden origin-top-right flex flex-col will-change-transform transform-gpu"
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
              className="flex w-full items-center justify-between px-3 py-2 rounded-2xl border-4 transition-all duration-150 group border-transparent hover:bg-(--accent-base) hover:border-(--border-main) hover:shadow-none hover:-translate-y-px text-(--text-main) hover:text-(--text-inverse)"
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
                className={`flex flex-col items-center justify-center py-2.5 rounded-xl border-2 border-(--border-dim) bg-(--bg-main) hover:border-(--border-main) hover:-translate-y-0.5 transition-all duration-150 group ${item.hoverClass}`}
              >
                <item.icon className="w-4 h-4 mb-1 transition-transform group-hover:scale-110 text-(--text-main)" />
                <span className="font-expanded font-black text-[8px] uppercase  text-center text-(--text-main)">
                  {item.title}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-2 flex gap-1.5 bg-(--bg-main) border-t-4 border-(--border-main) shrink-0">
        <button
          onClick={() => {
            onNavigate({
              title: "Settings",
              url: "#settings",
              category: "System",
            });
            onClose();
          }}
          className="flex-1 flex items-center justify-center p-2.5 rounded-l-2xl rounded-r-md border-2 border-(--border-main) bg-(--bg-surface) text-(--text-main) hover:bg-blue-400 hover:text-black hover:border-(--border-main) transition-all active:scale-95 group"
          title="Settings"
        >
          <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
        </button>

        <button
          onClick={() => {
            onLegacyToggle();
            onClose();
          }}
          className="flex-1 flex items-center justify-center p-2.5 rounded-md border-2 border-(--border-main) text-white hover:brightness-110 hover:border-(--border-main) transition-all active:scale-95 group"
          style={{
            background:
              "linear-gradient(130deg, rgb(36, 85, 163) 23%, rgb(52, 151, 219) 52%, rgb(52, 142, 219) 58%, rgb(52, 131, 219) 65%, rgb(40, 116, 166) 74%)",
          }}
          title="Legacy View"
        >
          <span className="text-xs group-hover:scale-110 transition-transform tracking-wider !font-['Times_New_Roman',_Times,_serif] !font-bold !text-white">
            VTOP
          </span>
        </button>

        <button
          onClick={onLogout}
          className="flex-1 flex items-center justify-center p-2.5 rounded-r-2xl rounded-l-md border-2 border-(--border-main) bg-(--bg-surface) text-red-500 hover:text-white hover:bg-red-500 hover:border-(--border-main) transition-all active:scale-95 group"
          title="Log Out"
        >
          <Logout className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
};
