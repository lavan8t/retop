import type { Transition } from "framer-motion";
import { MotionGlobalConfig } from "framer-motion";
import { useSettingsStore } from "./settings-store";

// ═══════════════════════════════════════════════════════════════════════
// UNIFIED ANIMATION TOKENS — Single source of truth for ALL motion in Retop.
// No hardcoded ms/s/stiffness/damping values anywhere else in the codebase.
// ═══════════════════════════════════════════════════════════════════════

// ── Duration tokens (seconds) ────────────────────────────────────────
/** ~100ms — micro-interactions: toggles, icon swaps, chip presses */
export const DURATION_FAST = 0.1;
/** ~150ms — dropdown exits, tooltip fade, button feedback */
export const DURATION_NORMAL = 0.15;
/** ~200ms — fade-ins, list reveals, card content appear */
export const DURATION_MODERATE = 0.2;
/** ~250ms — page-level enter transitions */
export const DURATION_SLOW = 0.25;
/** ~400ms — dramatic reveals, login page fades */
export const DURATION_DRAMATIC = 0.4;
/** ~500ms — host container open/close, UI toggle */
export const DURATION_HOST = 0.5;

// ── Stagger tokens (seconds) ─────────────────────────────────────────
/** Per-item stagger for list items */
export const STAGGER_ITEM = 0.03;
/** Per-item stagger for attendance cards */
export const STAGGER_CARD = 0.05;

// ── Easing presets ───────────────────────────────────────────────────
/** Standard Material 3 emphasized easing */
export const EASE_STANDARD = [0.4, 0, 0.2, 1] as const;
/** Overshoot / bouncy easing — popups, dropdowns */
export const EASE_OVERSHOOT = [0.34, 1.56, 0.64, 1] as const;
/** Decelerate — entering elements */
export const EASE_DECELERATE = [0.0, 0.0, 0.2, 1] as const;
export const EASE_OUT = "easeOut" as const;
export const EASE_IN = "easeIn" as const;
export const EASE_IN_OUT = "easeInOut" as const;

// ── Animation-only durations (for CSS keyframe animations) ───────────
/** Progress bar / meter fill animation */
export const DURATION_PROGRESS = 1.5;
/** Looping pulse / breathing animations */
export const DURATION_PULSE = 0.8;
/** Spinner rotation cycle */
export const DURATION_SPINNER = 1.0;

// ── Spring presets (framer-motion Transition objects) ─────────────────
/** Standard spring for card hover/tap interactions */
export const SPRING_SNAPPY: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 25,
};

/** Faster spring for micro-interactions (toggles, pills, indicators) */
export const SPRING_QUICK: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

/** Soft spring for page transitions, large layout shifts */
export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 28,
};

/** Bouncy spring for view toggle pill indicator */
export const SPRING_BOUNCY: Transition = {
  type: "spring",
  stiffness: 600,
  damping: 25,
  mass: 0.5,
};

/** Nav bottom bar spring */
export const SPRING_NAV: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 35,
  mass: 0.8,
};

// ── Composite transition presets ─────────────────────────────────────
/** Tooltip appear */
export const TRANSITION_TOOLTIP: Transition = {
  duration: DURATION_FAST + 0.02, // 0.12s
  ease: EASE_OUT,
};

/** Snackbar enter */
export const TRANSITION_SNACKBAR_ENTER: Transition = {
  ease: EASE_OUT,
  duration: DURATION_MODERATE + 0.025, // 0.225s
};

/** Snackbar exit */
export const TRANSITION_SNACKBAR_EXIT: Transition = {
  ease: EASE_IN,
  duration: DURATION_NORMAL + 0.045, // 0.195s
};

/** Menu open (popover / dropdown) */
export const TRANSITION_MENU_OPEN: Transition = {
  duration: DURATION_FAST / 2, // 0.05s — instant feel
  ease: EASE_OUT,
};

/** Menu close */
export const TRANSITION_MENU_CLOSE: Transition = {
  duration: DURATION_FAST / 2, // 0.05s
  ease: EASE_IN,
};

/** Dropdown exit (search, semester, etc.) */
export const TRANSITION_DROPDOWN_EXIT: Transition = {
  duration: DURATION_NORMAL,
  ease: EASE_OUT,
};

/** Fade in for list content */
export const TRANSITION_FADE_IN: Transition = {
  duration: DURATION_MODERATE,
};

/** Page enter — slightly slower tween */
export const TRANSITION_PAGE_ENTER: Transition = {
  duration: DURATION_SLOW,
  ease: EASE_OUT,
};

/** Dramatic reveal (login steps, large content blocks) */
export const TRANSITION_DRAMATIC: Transition = {
  duration: DURATION_DRAMATIC,
};

/** Dropdown item with overshoot easing */
export const TRANSITION_OVERSHOOT: Transition = {
  duration: DURATION_MODERATE,
  ease: EASE_OVERSHOOT as unknown as [number, number, number, number],
};

/** Progress bar fill animation */
export const TRANSITION_PROGRESS: Transition = {
  duration: DURATION_PROGRESS,
  ease: "circOut",
  delay: DURATION_MODERATE,
};

/** Looping pulse animation */
export const TRANSITION_PULSE: Transition = {
  duration: DURATION_PULSE,
  repeat: Infinity,
  ease: EASE_IN_OUT,
};

// ── Gesture presets ──────────────────────────────────────────────────
export const HOVER_LIFT = {};
export const TAP_PRESS = {};

// ── Animation scale subscriber (settings-driven) ────────────────────
useSettingsStore.subscribe((state) => {
  const scale = state.settings.animationScale || "1x";
  if (scale === "0x") {
    MotionGlobalConfig.skipAnimations = true;
  } else {
    MotionGlobalConfig.skipAnimations = false;
    const isFast = scale === "0.5x";
    (SPRING_SNAPPY as any).stiffness = isFast ? 1600 : 400;
    (SPRING_SNAPPY as any).damping = isFast ? 50 : 25;

    (SPRING_QUICK as any).stiffness = isFast ? 2000 : 500;
    (SPRING_QUICK as any).damping = isFast ? 60 : 30;
  }
});
