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
import { motion, AnimatePresence, Variants, Transition } from "framer-motion";

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
      hoverClass: "hover:bg-cyan-400 hover:shadow-[3px_3px_0px_0px_#000]",
    },
    {
      title: "Bank Info",
      icon: CreditCard,
      url: "fees/StudentBankInfo",
      cat: "Profile",
      hoverClass: "hover:bg-lime-400 hover:shadow-[3px_3px_0px_0px_#000]",
    },
    {
      title: "Backup Codes",
      icon: SquareStack,
      url: "user/backupCodes",
      cat: "Settings",
      hoverClass: "hover:bg-yellow-400 hover:shadow-[3px_3px_0px_0px_#000]",
    },
  ];

  const editItems = [
    {
      title: "Password",
      icon: Key,
      url: "user/changePassword",
      cat: "Settings",
      hoverClass: "hover:bg-pink-400 hover:shadow-[2px_2px_0px_0px_#000]",
    },
    {
      title: "Login ID",
      icon: UserCog,
      url: "user/updateLoginId",
      cat: "Settings",
      hoverClass: "hover:bg-blue-400 hover:shadow-[2px_2px_0px_0px_#000]",
    },
  ];

  // Aggressive iOS Spring physics for the "Pop" effect
  const iosSpring: Transition = {
    type: "spring",
    stiffness: 900,
    damping: 30,
    mass: 0.6,
  };

  const menuVariants: Variants = {
    hidden: {
      opacity: 0,
      scale: 0.4,
      y: -20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        ...iosSpring,
        staggerChildren: 0.02,
      } as Transition,
    },
    exit: {
      opacity: 0,
      scale: 0.5,
      y: -10,
      transition: { duration: 0.15, ease: "circIn" },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8, y: 10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: iosSpring,
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop: Positioned to only blur main content if rendered inside main container */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            /* Using rounded-[32px] for the parent */
            className="absolute right-4 mt-2 w-64 bg-(--bg-surface) border-4 border-(--border-main) rounded-4xl shadow-[8px_8px_0px_0px_var(--border-main)] z-50 overflow-hidden origin-top-right flex flex-col will-change-transform transform-gpu"
          >
            <div className="overflow-y-auto custom-scrollbar p-2 flex-1">
              <div className="space-y-1 mb-1">
                {mainItems.map((item, i) => (
                  <motion.button
                    key={i}
                    variants={itemVariants}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      onNavigate({
                        title: item.title,
                        url: item.url,
                        category: item.cat,
                      });
                      onClose();
                    }}
                    /* flex-1 instead of w-full to prevent horizontal overflow */
                    className={`flex flex-1 w-full items-center justify-between p-2 rounded-3xl border-2 border-transparent hover:border-black hover:-translate-y-0.5 text-(--text-main) transition-all duration-150 group ${item.hoverClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        {/* Naked, vibrant icons */}
                        <item.icon className="w-5 h-5 text-(--text-main) group-hover:text-black transition-colors" />
                      </div>
                      <span className="font-expanded font-black text-[10px] uppercase tracking-wider text-left mt-0.5">
                        {item.title}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-(--text-main)" />
                  </motion.button>
                ))}
              </div>

              {/* Security Section with extra top spacing */}
              <motion.div
                variants={itemVariants}
                className="pt-4 mt-2 border-t-2 border-(--border-dim) mb-1"
              >
                <div className="flex items-center gap-2 px-1.5 mb-2.5">
                  <PenTool className="w-3 h-3 text-(--text-dim)" />
                  <span className="text-[9px] font-expanded font-black uppercase tracking-widest text-(--text-dim)">
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
                      className={`flex flex-col items-center justify-center py-2.5 rounded-xl border-2 border-(--border-dim) bg-(--bg-main) hover:border-black hover:-translate-y-0.5 transition-all duration-150 group ${item.hoverClass}`}
                    >
                      <item.icon className="w-4 h-4 mb-1 transition-transform group-hover:scale-110 text-(--text-main)" />
                      <span className="font-expanded font-black text-[8px] uppercase tracking-tighter text-center text-(--text-main)">
                        {item.title}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Bottom Action Bar: Specific Corner Radii fix */}
            <motion.div
              className="p-2 flex gap-1.5 bg-(--bg-main) border-t-4 border-(--border-main) shrink-0"
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
                /* Left button: bottom-left follows parent radius (32 - 8 = 24) */
                className="flex-1 flex items-center justify-center p-2.5 rounded-tl-lg rounded-tr-lg rounded-bl-3xl rounded-br-lg border-2 border-(--border-main) bg-(--bg-surface) text-(--text-main) hover:bg-blue-400 hover:border-black hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all active:scale-95 group"
              >
                <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
              </button>

              <button
                onClick={onLogout}
                /* Right button: bottom-right follows parent radius */
                className="flex-1 flex items-center justify-center p-2.5 rounded-tl-lg rounded-tr-lg rounded-br-3xl rounded-bl-lg border-2 border-(--border-main) bg-(--bg-surface) text-red-500 hover:text-white hover:bg-red-500 hover:border-black hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all active:scale-95 group"
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
