import React, { useMemo } from "react";
import { motion, AnimatePresence, Transition } from "framer-motion";
import { Home, Calendar, Layers, BookOpen, GraduationCap } from "lucide-react";

interface BottomNavProps {
  currentView: string;
  setCurrentView: (view: any) => void;
}

const mobileNavLinks = [
  { id: "dashboard", title: "Home", icon: Home, color: "bg-yellow-400" },
  {
    id: "timetable",
    title: "Schedule",
    icon: Calendar,
    color: "bg-purple-400",
  },
  { id: "coursePage", title: "Subjects", icon: Layers, color: "bg-cyan-400" },
  { id: "curriculum", title: "Baskets", icon: BookOpen, color: "bg-blue-400" },
  { id: "marks", title: "Marks", icon: GraduationCap, color: "bg-lime-400" },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  setCurrentView,
}) => {
  // A tighter, highly synchronized spring.
  // We will pass this to EVERYTHING so the layout and width animate exactly together.
  const syncSpring: Transition = useMemo(
    () => ({ type: "spring", stiffness: 400, damping: 30, mass: 1 }),
    [],
  );

  return (
    <motion.nav
      layout
      transition={syncSpring}
      className="xl:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/85 backdrop-blur-md border-4 border-black rounded-4xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-9999 flex items-center p-1.5 gap-1.5 pointer-events-auto w-max"
    >
      {mobileNavLinks.map((link) => {
        const isActive = currentView === link.id;
        return (
          <motion.button
            layout
            transition={syncSpring}
            key={link.id}
            onClick={() => setCurrentView(link.id)}
            // FIX: Padding is now strictly constant (px-3.5 py-2.5).
            // The expanding width of the text handles the horizontal growth natively!
            className={`relative flex items-center justify-center rounded-3xl transition-colors overflow-hidden px-3.5 py-2.5 ${
              isActive
                ? `${link.color} text-black shadow-inner`
                : "text-zinc-500 hover:text-zinc-300 bg-transparent"
            }`}
            whileTap={{ scale: 0.92 }}
          >
            <motion.div
              layout
              transition={syncSpring}
              className="relative z-10 flex items-center justify-center shrink-0"
            >
              <link.icon
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-all ${
                  isActive ? "stroke-[2.5px]" : "stroke-2"
                }`}
              />
            </motion.div>

            <AnimatePresence initial={false}>
              {isActive && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={syncSpring}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <span className="block font-black font-expanded uppercase text-[10px] sm:text-[11px] tracking-widest pl-2 z-10">
                    {link.title}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </motion.nav>
  );
};
