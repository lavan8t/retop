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


