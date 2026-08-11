import React, { useState, useRef, useEffect } from "react";
import { Refresh } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

interface PullToRefreshProps {
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  disabled?: boolean;
  threshold?: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  isRefreshing = false,
  disabled = false,
  threshold = 70,
  children,
  className = "",
  style = {},
  scrollRef: externalScrollRef,
  onScroll,
}) => {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const containerRef = externalScrollRef || internalScrollRef;

  const [pullDistance, setPullDistance] = useState(0);
  const [pullState, setPullState] = useState<"idle" | "pulling" | "ready" | "refreshing">("idle");

  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  useEffect(() => {
    if (isRefreshing) {
      setPullState("refreshing");
    } else if (pullState === "refreshing") {
      setPullState("idle");
      setPullDistance(0);
    }
  }, [isRefreshing]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (disabled || isRefreshing || !onRefresh) return;
    const container = containerRef.current;
    if (container && container.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPullingRef.current || disabled || isRefreshing || !onRefresh) return;
    const container = containerRef.current;
    if (!container) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;

    if (container.scrollTop <= 0 && deltaY > 0) {
      // Damped pull distance calculation
      const distance = Math.min(110, deltaY * 0.45);
      setPullDistance(distance);

      if (distance >= threshold) {
        setPullState("ready");
      } else {
        setPullState("pulling");
      }
    } else {
      if (pullDistance > 0) {
        setPullDistance(0);
        setPullState("idle");
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= threshold && onRefresh && !isRefreshing) {
      setPullState("refreshing");
      setPullDistance(threshold);
      try {
        const res = onRefresh();
        if (res && typeof res.then === "function") {
          res.finally(() => {
            setPullState("idle");
            setPullDistance(0);
          });
        }
      } catch (err) {
        setPullState("idle");
        setPullDistance(0);
      }
    } else {
      setPullState("idle");
      setPullDistance(0);
    }
  };

  const activeRefreshing = isRefreshing || pullState === "refreshing";
  const displayDistance = activeRefreshing ? threshold : pullDistance;
  const rotation = Math.min(360, (displayDistance / threshold) * 360);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`relative ${className}`}
      style={style}
    >
      {/* Pull Indicator Pill */}
      {(displayDistance > 0 || activeRefreshing) && (
        <div
          className="left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-150 ease-out flex items-center justify-center"
          style={{
            position: "sticky",
            top: "12px",
            height: "0px",
            overflow: "visible",
          }}
        >
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-(--bg-surface) border-2 border-(--border-main) shadow-(--brutal-shadow-sm) text-xs font-bold font-expanded text-(--text-main) transition-transform duration-100 ${
              displayDistance >= threshold ? "scale-105 border-(--accent-base)" : ""
            }`}
            style={{
              transform: `translateY(${displayDistance > 0 ? Math.min(displayDistance, 60) : 0}px)`,
              opacity: Math.min(1, displayDistance / 25),
            }}
          >
            <Refresh
              className={`w-4 h-4 text-(--accent-base) transition-transform ${
                activeRefreshing ? "animate-spin" : ""
              }`}
              style={{
                transform: activeRefreshing ? undefined : `rotate(${rotation}deg)`,
              }}
            />
            <span>
              {activeRefreshing
                ? "Syncing..."
                : displayDistance >= threshold
                ? "Release to Sync"
                : "Pull to Sync"}
            </span>
          </div>
        </div>
      )}

      {children}
    </div>
  );
};
