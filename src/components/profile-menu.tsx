import React from "react";
import {
  UserCircle,
  Info,
  CreditCard,
  SquareStack,
  Key,
  UserCog,
  LogOut,
  Monitor,
  Settings,
  ChevronRight,
} from "lucide-react";
import { QuickLink } from "../types/vtop";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface ProfileMenuProps {
  isOpen: boolean;
  userName: string;
  onNavigate: (link: QuickLink) => void;
  onLegacyToggle: () => void;
  onLogout: () => void;
  onClose: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  isOpen,
  onNavigate,
  onLegacyToggle,
  onLogout,
  onClose,
}) => {
  const gridItems = [
    {
      title: "Profile View",
      icon: UserCircle,
      url: "studentsRecord/StudentProfileAllView",
      cat: "Profile",
      color: "hover:bg-cyan-400 hover:border-black",
      iconColor: "text-cyan-600",
    },
    {
      title: "Day Boarder Info",
      icon: Info,
      url: "studentsRecord/DayBoarderInfo",
      cat: "Profile",
      color: "hover:bg-lime-400 hover:border-black",
      iconColor: "text-lime-600",
    },
    {
      title: "Bank Information",
      icon: CreditCard,
      url: "fees/StudentBankInfo",
      cat: "Profile",
      color: "hover:bg-yellow-400 hover:border-black",
      iconColor: "text-yellow-600",
    },
    {
      title: "Backup Codes",
      icon: SquareStack,
      url: "user/backupCodes",
      cat: "Settings",
      color: "hover:bg-lime-400 hover:border-black",
      iconColor: "text-lime-600",
    },
    {
      title: "Change Password",
      icon: Key,
      url: "user/changePassword",
      cat: "Settings",
      color: "hover:bg-cyan-400 hover:border-black",
      iconColor: "text-cyan-600",
    },
    {
      title: "Update Login ID",
      icon: UserCog,
      url: "user/updateLoginId",
      cat: "Settings",
      color: "hover:bg-cyan-400 hover:border-black",
      iconColor: "text-cyan-600",
    },
  ];

  const menuVariants: Variants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      y: -10,
      transition: { duration: 0.15 },
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 350,
        damping: 25,
        staggerChildren: 0.04,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -5,
      transition: { duration: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  return (
    <>
      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            display: flex;
            white-space: nowrap;
            width: max-content; 
            animation: marquee 6s linear infinite;
            animation-play-state: paused;
          }
          .group:hover .group-hover\\:animate-marquee {
            animation-play-state: running;
          }
        `}
      </style>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/10"
              onClick={onClose}
            />

            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute right-0 top-16 mt-2 w-80 bg-zinc-950 border-4 border-zinc-800 rounded-4xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50 overflow-hidden origin-top-right"
            >
              <div className="p-3 bg-zinc-950">
                <div className="grid grid-cols-2 gap-2">
                  {gridItems.map((item, i) => (
                    <motion.button
                      key={i}
                      variants={itemVariants}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        onNavigate({
                          title: item.title,
                          url: item.url,
                          category: item.cat,
                        });
                        onClose();
                      }}
                      className={`
                        flex flex-col items-center justify-center p-2 rounded-xl 
                        border-2 border-zinc-200 bg-zinc-100 
                        transition-all duration-200 group relative overflow-hidden h-28 gap-2 shadow-sm
                        ${item.color} hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                      `}
                    >
                      <div className="p-2 bg-white rounded-full group-hover:bg-white/20 transition-colors border border-zinc-100 group-hover:border-transparent">
                        <item.icon
                          className={`w-7 h-7 ${item.iconColor} group-hover:text-[#0d0d0d] transition-colors`}
                        />
                      </div>

                      <div
                        className="w-full relative h-5 overflow-hidden flex items-center justify-center"
                        style={{
                          maskImage:
                            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
                        }}
                      >
                        <div className="flex gap-4 group-hover:animate-marquee">
                          {[1, 2, 3].map((_, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-black text-black group-hover:text-[#0d0d0d] uppercase tracking-tight whitespace-nowrap"
                            >
                              {item.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="h-1 bg-zinc-800 border-t-2 border-black/10 mx-0"></div>

              <motion.div
                className="p-2 space-y-1 bg-zinc-900/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.2 } }}
              >
                <motion.button
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onNavigate({
                      title: "Settings",
                      url: "#settings",
                      category: "System",
                    });
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-transparent hover:bg-zinc-950 hover:border-zinc-800 hover:shadow-[4px_4px_0px_0px_#000] transition-all group"
                >
                  <Settings className="w-5 h-5 text-zinc-500 group-hover:text-blue-500 transition-colors" />
                  <span className="text-sm font-bold font-expanded uppercase text-zinc-400 group-hover:text-zinc-200 tracking-widest">
                    Preferences
                  </span>
                  <ChevronRight className="w-4 h-4 ml-auto text-zinc-600 opacity-0 group-hover:opacity-100 transition-all" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onLegacyToggle}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-transparent hover:bg-zinc-950 hover:border-zinc-800 hover:shadow-[4px_4px_0px_0px_#000] transition-all group"
                >
                  <Monitor className="w-5 h-5 text-zinc-500 group-hover:text-yellow-500 transition-colors" />
                  <span className="text-sm font-bold font-expanded uppercase text-zinc-400 group-hover:text-zinc-200 tracking-widest">
                    Legacy UI
                  </span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-transparent hover:bg-red-500 hover:border-black hover:shadow-[4px_4px_0px_0px_#000] transition-all group"
                >
                  <LogOut className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
                  <span className="text-sm font-bold font-expanded uppercase text-zinc-400 group-hover:text-white tracking-widest">
                    Logout
                  </span>
                </motion.button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
