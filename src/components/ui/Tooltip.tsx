import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
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

    // If tooltip is too close to the top, flip it to show below the element
    if (rect.top < 40) {
      y = rect.bottom;
      flipped = true;
    }

    if (tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const halfWidth = tooltipRect.width / 2;
      
      // Clamp X to screen edges
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
    if (!show) return;

    updatePosition();
    
    // Use requestAnimationFrame to let the tooltip render first so we can measure its width
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
      onFocus={handleShow}
      onBlur={handleHide}
    >
      {children}
      {portalNode &&
        createPortal(
          <AnimatePresence>
            {show && coords && (
              <div
                key="tooltip-portal"
                className="fixed z-[100000] pointer-events-none"
                style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
              >
                <motion.div
                  ref={tooltipRef}
                  initial={{ opacity: 0, y: isFlipped ? -4 : 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: isFlipped ? -4 : 4, scale: 0.95 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className={`absolute left-1/2 -translate-x-1/2 px-3 py-1.5 bg-(--bg-surface) text-(--text-main) text-xs font-bold rounded-full whitespace-nowrap shadow-md border border-(--border-main) ${
                    isFlipped ? "top-full mt-2 origin-top" : "bottom-full mb-2 origin-bottom"
                  }`}
                >
                  {text}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          portalNode
        )}
    </div>
  );
};
