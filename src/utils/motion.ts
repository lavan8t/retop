import type { Transition } from "framer-motion";
import { MotionGlobalConfig } from "framer-motion";
import { useSettingsStore } from "./settings-store";

/** Standard spring for card hover/tap interactions */
export const SPRING_SNAPPY: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 25,
};

/** Faster spring for micro-interactions (toggles, pills) */
export const SPRING_QUICK: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

useSettingsStore.subscribe((state) => {
  const scale = state.settings.animationScale || "1x";
  if (scale === "0x") {
    MotionGlobalConfig.skipAnimations = true;
  } else {
    MotionGlobalConfig.skipAnimations = false;
    const isFast = scale === "0.5x";
    SPRING_SNAPPY.stiffness = isFast ? 1600 : 400;
    SPRING_SNAPPY.damping = isFast ? 50 : 25;
    
    SPRING_QUICK.stiffness = isFast ? 2000 : 500;
    SPRING_QUICK.damping = isFast ? 60 : 30;
  }
});

export const HOVER_LIFT = {};

export const TAP_PRESS = {};
