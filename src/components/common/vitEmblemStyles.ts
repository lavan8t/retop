export const VIT_EMBLEM_ANIMATION_CSS = `
.vit-emblem-loader,
.vit-emblem-splash {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-base, #60a5fa);
  user-select: none;
  pointer-events: none;
}
.vit-emblem-loader svg,
.vit-emblem-splash svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
  fill: currentColor;
}
.vit-emblem-loader svg path,
.vit-emblem-loader svg polygon,
.vit-emblem-loader svg g,
.vit-emblem-splash svg path,
.vit-emblem-splash svg polygon,
.vit-emblem-splash svg g {
  transform-box: fill-box;
}
.vit-emblem-loader svg #moto_ribbon,
.vit-emblem-loader svg #moto_tamil_text,
.vit-emblem-loader svg #moto-ribbon,
.vit-emblem-loader svg #moto-tamil-text,
.vit-emblem-splash svg #moto_ribbon,
.vit-emblem-splash svg #moto_tamil_text,
.vit-emblem-splash svg #moto-ribbon,
.vit-emblem-splash svg #moto-tamil-text {
  opacity: 0;
  transform-origin: center;
  animation: vit-ribbon-scale-down 0.28s cubic-bezier(0.12, 0.9, 0.2, 1) 0s forwards;
}
.vit-emblem-loader svg #outer_circle,
.vit-emblem-loader svg #outer-circle,
.vit-emblem-splash svg #outer_circle,
.vit-emblem-splash svg #outer-circle {
  stroke-dasharray: 440;
  stroke-dashoffset: 440;
  animation: vit-circle-draw 0.3s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards;
}
.vit-emblem-loader svg #inner_circle,
.vit-emblem-loader svg #inner-circle,
.vit-emblem-splash svg #inner_circle,
.vit-emblem-splash svg #inner-circle {
  stroke-dasharray: 380;
  stroke-dashoffset: 380;
  animation: vit-circle-draw 0.3s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards;
}
.vit-emblem-loader svg #fort,
.vit-emblem-splash svg #fort {
  opacity: 0;
  transform: translateY(105px);
  animation: vit-fort-rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards;
}
.vit-emblem-loader svg #vit_center,
.vit-emblem-loader svg #vit-center,
.vit-emblem-splash svg #vit_center,
.vit-emblem-splash svg #vit-center {
  opacity: 0;
  transform: translateY(-35px);
  animation: vit-center-drop 0.22s cubic-bezier(0.16, 1, 0.3, 1) 0.75s forwards;
}
.vit-emblem-loader svg #left_lines,
.vit-emblem-loader svg #right_lines,
.vit-emblem-loader svg #left-lines,
.vit-emblem-loader svg #right-lines,
.vit-emblem-splash svg #left_lines,
.vit-emblem-splash svg #right_lines,
.vit-emblem-splash svg #left-lines,
.vit-emblem-splash svg #right-lines {
  opacity: 0;
  transform: translateY(20px);
  animation: vit-left-lines-rise 0.25s cubic-bezier(0.16, 1, 0.3, 1) 0.95s forwards;
}
.vit-emblem-loader svg #vellore_insititute_of_technology_circle_text,
.vit-emblem-loader svg #institute_name,
.vit-emblem-loader svg #institute-name,
.vit-emblem-splash svg #vellore_insititute_of_technology_circle_text,
.vit-emblem-splash svg #institute_name,
.vit-emblem-splash svg #institute-name {
  opacity: 0;
  animation: vit-institute-fade 0.25s ease-out 1.15s forwards;
}
.vit-emblem-loader svg #left_star,
.vit-emblem-loader svg #left-star,
.vit-emblem-splash svg #left_star,
.vit-emblem-splash svg #left-star {
  opacity: 0;
  transform-origin: center;
  animation: vit-left-star-stamp 0.24s cubic-bezier(0.12, 0.9, 0.2, 1) 1.35s forwards, vit-star-spin-right 6s linear 1.59s infinite;
}
.vit-emblem-loader svg #right_star,
.vit-emblem-loader svg #right-star,
.vit-emblem-splash svg #right_star,
.vit-emblem-splash svg #right-star {
  opacity: 0;
  transform-origin: center;
  animation: vit-right-star-stamp 0.24s cubic-bezier(0.12, 0.9, 0.2, 1) 1.50s forwards, vit-star-spin-left 6s linear 1.74s infinite;
}
@keyframes vit-ribbon-scale-down {
  0% { opacity: 1; transform: scale(2.8); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes vit-circle-draw {
  to { stroke-dashoffset: 0; }
}
@keyframes vit-fort-rise {
  0% { opacity: 0; transform: translateY(105px); }
  20% { opacity: 1; }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes vit-center-drop {
  0% { opacity: 0; transform: translateY(-35px); }
  40% { opacity: 1; }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes vit-left-lines-rise {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes vit-institute-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes vit-left-star-stamp {
  0% { opacity: 1; transform: translate(-35px, -15px) scale(3.8); }
  100% { opacity: 1; transform: translate(0, 0) scale(1); }
}
@keyframes vit-right-star-stamp {
  0% { opacity: 1; transform: translate(35px, -15px) scale(3.8); }
  100% { opacity: 1; transform: translate(0, 0) scale(1); }
}
@keyframes vit-star-spin-right {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes vit-star-spin-left {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

/* Fast completion trigger: finishes in 150ms, holds still for 50ms fade */
.vit-emblem-fast-finish,
.vit-emblem-loader.vit-emblem-fast-finish,
.vit-emblem-splash.vit-emblem-fast-finish {
  transition: opacity 50ms ease-out !important;
}
.vit-emblem-fast-finish svg path,
.vit-emblem-fast-finish svg polygon,
.vit-emblem-fast-finish svg g,
.vit-emblem-fast-finish svg circle,
.vit-emblem-fast-finish svg #outer_circle,
.vit-emblem-fast-finish svg #outer-circle,
.vit-emblem-fast-finish svg #inner_circle,
.vit-emblem-fast-finish svg #inner-circle,
.vit-emblem-fast-finish svg #moto_ribbon,
.vit-emblem-fast-finish svg #moto-ribbon,
.vit-emblem-fast-finish svg #moto_tamil_text,
.vit-emblem-fast-finish svg #moto-tamil-text,
.vit-emblem-fast-finish svg #fort,
.vit-emblem-fast-finish svg #vit_center,
.vit-emblem-fast-finish svg #vit-center,
.vit-emblem-fast-finish svg #left_lines,
.vit-emblem-fast-finish svg #right_lines,
.vit-emblem-fast-finish svg #left-lines,
.vit-emblem-fast-finish svg #right-lines,
.vit-emblem-fast-finish svg #vellore_insititute_of_technology_circle_text,
.vit-emblem-fast-finish svg #institute_name,
.vit-emblem-fast-finish svg #institute-name,
.vit-emblem-fast-finish svg #left_star,
.vit-emblem-fast-finish svg #left-star,
.vit-emblem-fast-finish svg #right_star,
.vit-emblem-fast-finish svg #right-star {
  animation: none !important;
  opacity: 1 !important;
  transform: none !important;
  stroke-dashoffset: 0 !important;
  transition: opacity 150ms ease-out, transform 150ms cubic-bezier(0.16, 1, 0.3, 1), stroke-dashoffset 150ms cubic-bezier(0.16, 1, 0.3, 1) !important;
}
`;
