import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  createHiddenForm,
  initializeContainer,
  setUIVisibility,
} from "../utils/bridge";
import {
  User,
  Briefcase,
  Users,
  GraduationCap,
  Monitor,
  ArrowRight,
} from "lucide-react";
import { applyTheme, AppSettings } from "../utils/settings-store";

export function renderLandingPage() {
  const csrfInput = document.querySelector<HTMLInputElement>(
    'input[name="_csrf"]',
  );
  const csrfToken = csrfInput?.value;
  if (!csrfToken) return;

  initializeContainer();
  const rootEl = document.getElementById("vtop-remastered-root");
  if (rootEl) {
    const root = createRoot(rootEl);
    root.render(<LandingPage csrf={csrfToken} />);
  }
}

interface LandingPageProps {
  csrf: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ csrf }) => {
  const [isModernUI, setIsModernUI] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("vtop-remastered-settings");
      if (saved) {
        const settings: AppSettings = JSON.parse(saved);
        applyTheme(settings);
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
      }
    } catch (e) {
      console.error("Failed to load theme:", e);
    }
  }, []);

  useEffect(() => {
    setUIVisibility(isModernUI);
  }, [isModernUI]);

  useEffect(() => {
    const restoreHandler = () => setIsModernUI(true);
    window.addEventListener("vtop-restore-ui", restoreHandler);
    return () => window.removeEventListener("vtop-restore-ui", restoreHandler);
  }, []);

  const handleNavigation = (flag: string) => {
    const form = createHiddenForm("/vtop/prelogin/setup", {
      _csrf: csrf,
      flag: flag,
    });
    form?.submit();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-zinc-950 font-mono selection:bg-blue-500 selection:text-white text-zinc-200">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[50vw] h-[50vw] bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[20%] w-[50vw] h-[50vw] bg-cyan-500/10 rounded-full blur-[120px]"></div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        ></div>
      </div>

      <div className="text-center mb-16 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="inline-block mb-6 relative group cursor-default">
          <div className="absolute top-2 left-2 w-full h-full bg-black rounded-3xl -z-10 transition-transform duration-300 group-hover:translate-x-2 group-hover:translate-y-2"></div>

          <div className="bg-blue-500 text-white border-4 border-black px-10 py-6 rounded-3xl transform transition-transform duration-300 group-hover:-translate-y-1">
            <h1 className="text-7xl md:text-9xl font-expanded font-black tracking-tighter leading-none drop-shadow-md">
              VTOP
            </h1>
            <div className="w-full h-2 bg-black mt-2 mb-1 rounded-full opacity-20"></div>
            <p className="text-sm font-bold uppercase tracking-[0.5em] text-blue-100">
              Remastered
            </p>
          </div>
        </div>

        <p className="text-lg md:text-xl text-zinc-500 font-bold uppercase tracking-[0.3em] mt-8 animate-in slide-in-from-bottom-4 duration-700 delay-100 bg-zinc-900/50 px-4 py-2 rounded-xl border-2 border-zinc-800/50 inline-block backdrop-blur-sm">
          Select Access Portal
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1400px] w-full relative z-10 px-4">
        <LandingCard
          title="Student"
          icon={User}
          accentColor="blue"
          onClick={() => handleNavigation("VTOP")}
          delay="delay-0"
        />
        <LandingCard
          title="Employee"
          icon={Briefcase}
          accentColor="purple"
          onClick={() => handleNavigation("VTOP")}
          delay="delay-100"
        />
        <LandingCard
          title="Parent"
          icon={Users}
          accentColor="orange"
          onClick={() => handleNavigation("parent")}
          delay="delay-200"
        />
        <LandingCard
          title="Alumni"
          icon={GraduationCap}
          accentColor="lime"
          onClick={() => handleNavigation("alumni")}
          delay="delay-300"
        />
      </div>

      <div className="mt-20 text-zinc-600 text-xs font-bold uppercase tracking-widest font-mono opacity-50 hover:opacity-100 transition-opacity">
        System v2.1 • Crafted with <span className="text-red-500">♥</span> by
        Binovators
      </div>

      <button
        onClick={() => setIsModernUI(false)}
        className="fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3 bg-zinc-900 border-2 border-zinc-800 rounded-full text-zinc-500 hover:text-black hover:bg-yellow-500 hover:border-black hover:shadow-[4px_4px_0px_0px_#000] transition-all active:scale-95 group z-[100]"
      >
        <Monitor className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">
          Legacy UI
        </span>
      </button>
    </div>
  );
};

interface CardProps {
  title: string;
  icon: any;
  accentColor: "blue" | "purple" | "orange" | "lime";
  onClick: () => void;
  delay: string;
}

const LandingCard: React.FC<CardProps> = ({
  title,
  icon: Icon,
  accentColor,
  onClick,
  delay,
}) => {
  const colorMap = {
    blue: "bg-blue-500 text-blue-500 border-blue-500 group-hover:bg-blue-500",
    purple:
      "bg-purple-500 text-purple-500 border-purple-500 group-hover:bg-purple-500",
    orange:
      "bg-orange-500 text-orange-500 border-orange-500 group-hover:bg-orange-500",
    lime: "bg-lime-500 text-lime-500 border-lime-500 group-hover:bg-lime-500",
  };

  const accentClass = colorMap[accentColor];

  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full h-80 flex flex-col items-center justify-between 
        bg-zinc-900 border-4 border-zinc-800 rounded-[2.5rem] p-8
        transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        hover:-translate-y-2 hover:border-black hover:shadow-[8px_8px_0px_0px_var(--text-main)]
        active:translate-y-0 active:shadow-none
        animate-in fade-in slide-in-from-bottom-8 duration-700 ${delay}
      `}
    >
      <div className="flex-1 flex items-center justify-center w-full">
        <div
          className={`
            w-28 h-28 rounded-3xl border-4 border-zinc-800 bg-zinc-950 
            flex items-center justify-center shadow-inner transition-all duration-300
            group-hover:scale-110 group-hover:rotate-3 group-hover:border-black group-hover:shadow-none
            ${accentClass.split(" ")[1]} /* Text Color */
            ${accentClass.split(" ")[3]} /* Hover BG Color */
          `}
        >
          <Icon className="w-12 h-12 transition-colors duration-300 group-hover:text-white" />
        </div>
      </div>

      <div className="w-full flex items-center justify-between border-t-4 border-zinc-800 pt-6 mt-4 group-hover:border-black/20 transition-colors">
        <span className="text-2xl font-expanded font-black text-zinc-500 uppercase tracking-tight group-hover:text-zinc-200 transition-colors">
          {title}
        </span>
        <div
          className={`
            p-2 rounded-full border-2 border-zinc-800 text-zinc-600 
            group-hover:bg-black group-hover:text-white group-hover:border-black
            transition-all duration-300 transform group-hover:-rotate-45
        `}
        >
          <ArrowRight className="w-5 h-5" />
        </div>
      </div>
    </button>
  );
};
