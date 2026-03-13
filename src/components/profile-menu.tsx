import React from "react";
import {
  UserCircle,
  CreditCard,
  SquareStack,
  Key,
  UserCog,
  LogOut,
  Settings,
  ChevronRight,
  PenTool,
} from "lucide-react";
import { QuickLink } from "../types/vtop";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface ProfileMenuProps {
  isOpen: boolean;
  userName: string;
  onNavigate: (link: QuickLink) => void;
  onLogout: () => void;
  onClose: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  isOpen,
  onNavigate,
  onLogout,
  onClose,
}) => {
  const mainItems = [
    {
      title: "Profile",
      icon: UserCircle,
      url: "studentsRecord/StudentProfileAllView",
      cat: "Profile",
      hoverClass:
        "hover:bg-cyan-400 hover:text-black hover:border-black hover:shadow-[4px_4px_0px_0px_#000]",
    },
    {
      title: "Bank Information",
      icon: CreditCard,
      url: "fees/StudentBankInfo",
      cat: "Profile",
      hoverClass:
        "hover:bg-lime-400 hover:text-black hover:border-black hover:shadow-[4px_4px_0px_0px_#000]",
    },
    {
      title: "Backup Codes",
      icon: SquareStack,
      url: "user/backupCodes",
      cat: "Settings",
      hoverClass:
        "hover:bg-yellow-400 hover:text-black hover:border-black hover:shadow-[4px_4px_0px_0px_#000]",
    },
  ];

  const editItems = [
    {
      title: "Password",
      icon: Key,
      url: "user/changePassword",
      cat: "Settings",
      hoverClass:
        "hover:bg-pink-400 hover:text-black hover:border-black hover:shadow-[3px_3px_0px_0px_#000]",
    },
    {
      title: "Login ID",
      icon: UserCog,
      url: "user/updateLoginId",
      cat: "Settings",
      hoverClass:
        "hover:bg-blue-400 hover:text-black hover:border-black hover:shadow-[3px_3px_0px_0px_#000]",
    },
  ];

  const menuVariants: Variants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      y: -15,
      transition: { duration: 0.1 },
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 700,
        damping: 30,
        staggerChildren: 0.03,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -10,
      transition: { duration: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 600, damping: 25 },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Click-away backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Menu Container */}
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute right-4 mt-4 w-75 bg-(--bg-surface) border-4 border-(--border-main) rounded-4xl shadow-[8px_8px_0px_0px_var(--border-main)] z-50 overflow-hidden origin-top-right flex flex-col max-h-[85vh] max-w-[calc(100vw-2rem)]"
          >
            {/* List Items */}
            <div className="overflow-y-auto custom-scrollbar p-3 space-y-2 flex-1">
              {mainItems.map((item, i) => (
                <motion.button
                  key={i}
                  variants={itemVariants}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onNavigate({
                      title: item.title,
                      url: item.url,
                      category: item.cat,
                    });
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl border-2 border-transparent bg-transparent hover:-translate-y-0.5 text-(--text-muted) transition-all duration-200 group ${item.hoverClass}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-(--border-dim) bg-(--bg-main) group-hover:bg-white group-hover:text-black group-hover:border-black transition-all shrink-0">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="font-expanded font-black text-xs uppercase tracking-widest text-left leading-none mt-1">
                      {item.title}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
                </motion.button>
              ))}

              {/* Edit Security Section */}
              <motion.div
                variants={itemVariants}
                className="pt-2 border-t-2 border-(--border-dim)"
              >
                <div className="flex items-center gap-2 px-2 py-1 mb-2">
                  <PenTool className="w-4 h-4 text-(--text-dim)" />
                  <span className="text-[10px] font-expanded font-black uppercase tracking-widest text-(--text-dim) mt-0.5">
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
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-(--border-dim) bg-(--bg-main) hover:-translate-y-0.5 text-(--text-muted) transition-all duration-200 group ${item.hoverClass}`}
                    >
                      <item.icon className="w-5 h-5 mb-2 transition-colors" />
                      <span className="font-expanded font-black text-[9px] uppercase tracking-widest text-center leading-none">
                        {item.title}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Bottom Action Bar */}
            <motion.div
              className="p-3 flex gap-2 bg-(--bg-main) border-t-4 border-(--border-main) shrink-0"
              variants={itemVariants}
            >
              <button
                onClick={() => {
                  onNavigate({
                    title: "Settings",
                    url: "#settings",
                    category: "System",
                  });
                  onClose();
                }}
                title="Preferences"
                className="flex-1 flex items-center justify-center p-3 rounded-xl border-2 border-(--border-main) bg-(--bg-surface) text-(--text-main) hover:bg-blue-400 hover:text-black hover:border-black hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 transition-all active:scale-95 active:shadow-none group"
              >
                <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>

              <button
                onClick={onLogout}
                title="Logout"
                className="flex-1 flex items-center justify-center p-3 rounded-xl border-2 border-(--border-main) bg-(--bg-surface) text-red-500 hover:text-white hover:bg-red-500 hover:border-black hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 transition-all active:scale-95 active:shadow-none group"
              >
                <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
