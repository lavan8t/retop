import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getAppRoot } from "../../utils/bridge";

export const Tooltip = ({
  children,
  text,
  className = "",
}: {
  children: React.ReactNode;
  text: string;
  className?: string;
}) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPortalNode(getAppRoot() || document.body);
  }, []);

  const updatePosition = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    
    let x = rect.left + rect.width / 2;
    let y = rect.top;
    let flipped = false;

    if (rect.top < 40) {
      y = rect.bottom;
      flipped = true;
    }

    if (tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const halfWidth = tooltipRect.width / 2;
      
      if (x - halfWidth < 12) {
        x = halfWidth + 12;
      } else if (x + halfWidth > window.innerWidth - 12) {
        x = window.innerWidth - halfWidth - 12;
      }
    }

    setCoords({ x, y });
    setIsFlipped(flipped);
  };

  const handleShow = () => {
    updatePosition();
    setShow(true);
  };

  const handleHide = () => {
    setShow(false);
  };

  useEffect(() => {
    const handleWindowBlur = () => setShow(false);
    window.addEventListener("blur", handleWindowBlur);
    return () => window.removeEventListener("blur", handleWindowBlur);
  }, []);

  useEffect(() => {
    if (!show) return;

    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [show]);

  if (!text) return <>{children}</>;

  return (
    <div
      ref={wrapperRef}
      className={`relative flex items-center justify-center ${className}`}
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
    >
      {children}
      {portalNode &&
        createPortal(
          show && coords ? (
            <div
              key="tooltip-portal"
              className="fixed z-[100000] pointer-events-none"
              style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
            >
              <div
                ref={tooltipRef}
                className={`absolute left-1/2 -translate-x-1/2 px-3 py-1.5 bg-(--bg-surface) text-(--text-main) text-xs font-bold rounded-full whitespace-nowrap shadow-md border border-(--border-main) transition-all duration-200 animate-in fade-in zoom-in-95 ${
                  isFlipped ? "top-full mt-2 origin-top" : "bottom-full mb-2 origin-bottom"
                }`}
              >
                {text}
              </div>
            </div>
          ) : null,
          portalNode
        )}
    </div>
  );
};

export const GlobalOverflowTooltip = () => {
  const [tooltipData, setTooltipData] = useState<{
    text: string;
    x: number;
    y: number;
    flipped: boolean;
  } | null>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const currentTargetRef = useRef<HTMLElement | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPortalNode(getAppRoot() || document.body);
  }, []);

  useEffect(() => {
    const isElementTruncated = (el: HTMLElement) => {
      return (
        el.scrollWidth > el.clientWidth + 1 ||
        el.scrollHeight > el.clientHeight + 1
      );
    };

    const handleMouseOver = (e: MouseEvent) => {
      const path = e.composedPath ? (e.composedPath() as unknown as HTMLElement[]) : [(e.target as unknown as HTMLElement)];
      
      let targetEl: HTMLElement | null = null;
      let text = "";

      for (const node of path) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as HTMLElement;

        // Skip interactive inputs/textareas
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") continue;

        // Convert title to data-tooltip to avoid ugly native tooltip collisions
        if (el.hasAttribute("title")) {
          const rawTitle = el.getAttribute("title") || "";
          if (rawTitle.trim()) {
            el.setAttribute("data-tooltip", rawTitle);
            el.removeAttribute("title");
          }
        }

        const dataTip = el.getAttribute("data-tooltip");
        const isInteractive =
          el.tagName === "BUTTON" ||
          el.tagName === "A" ||
          el.getAttribute("role") === "button" ||
          el.classList.contains("cursor-pointer");

        const style = window.getComputedStyle(el);
        const hasEllipsis =
          style.textOverflow === "ellipsis" ||
          style.webkitLineClamp !== "none" ||
          el.classList.contains("truncate") ||
          Array.from(el.classList).some((c) => c.startsWith("line-clamp-"));

        // If explicit tooltip on interactive element (button, icon, link)
        if (dataTip && dataTip.trim() && isInteractive && !hasEllipsis) {
          targetEl = el;
          text = dataTip.trim();
          break;
        }

        // For text elements (with or without data-tooltip), ONLY show if ACTUALLY truncated
        if (hasEllipsis && isElementTruncated(el)) {
          const raw = dataTip || el.innerText || el.textContent || "";
          if (raw.trim().length > 1) {
            targetEl = el;
            text = raw.trim();
            break;
          }
        }
      }

      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }

      if (targetEl && text) {
        if (currentTargetRef.current === targetEl && tooltipData) {
          return;
        }
        currentTargetRef.current = targetEl;

        showTimeoutRef.current = setTimeout(() => {
          if (!currentTargetRef.current) return;
          const rect = currentTargetRef.current.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const flipped = rect.top < 45;
          const y = flipped ? rect.bottom : rect.top;

          setTooltipData({ text, x, y, flipped });
        }, 120);
      } else {
        currentTargetRef.current = null;
        setTooltipData(null);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as Node | null;
      if (currentTargetRef.current) {
        if (!related || !currentTargetRef.current.contains(related)) {
          if (showTimeoutRef.current) {
            clearTimeout(showTimeoutRef.current);
            showTimeoutRef.current = null;
          }
          currentTargetRef.current = null;
          setTooltipData(null);
        }
      }
    };

    const handleScroll = () => {
      if (currentTargetRef.current) {
        const rect = currentTargetRef.current.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          if (showTimeoutRef.current) {
            clearTimeout(showTimeoutRef.current);
            showTimeoutRef.current = null;
          }
          setTooltipData(null);
          currentTargetRef.current = null;
        } else {
          const x = rect.left + rect.width / 2;
          const flipped = rect.top < 45;
          const y = flipped ? rect.bottom : rect.top;
          setTooltipData((prev) => (prev ? { ...prev, x, y, flipped } : null));
        }
      }
    };

    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
      document.removeEventListener("mouseover", handleMouseOver, true);
      document.removeEventListener("mouseout", handleMouseOut, true);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [tooltipData]);

  if (!tooltipData || !portalNode) return null;

  return createPortal(
    <div
      key="global-overflow-tooltip"
      className="fixed z-[100000] pointer-events-none"
      style={{ left: `${tooltipData.x}px`, top: `${tooltipData.y}px` }}
    >
      <div
        className={`absolute left-1/2 -translate-x-1/2 px-3 py-1.5 bg-(--bg-surface) text-(--text-main) text-xs font-bold rounded-full whitespace-normal max-w-sm text-center shadow-lg border border-(--border-main) transition-all duration-150 animate-in fade-in zoom-in-95 pointer-events-none ${
          tooltipData.flipped
            ? "top-full mt-2 origin-top"
            : "bottom-full mb-2 origin-bottom"
        }`}
      >
        {tooltipData.text}
      </div>
    </div>,
    portalNode,
  );
};
