import React, { useEffect, useRef, useState } from "react";

interface MarqueeTextProps {
  text: string;
  className?: string;
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({ text, className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        // Measure text width against container width
        const isOw = textRef.current.scrollWidth > containerRef.current.clientWidth;
        setIsOverflowing(isOw);
      }
    };
    
    // Slight delay to ensure fonts/layout are loaded before measuring
    const timeout = setTimeout(checkOverflow, 100);
    window.addEventListener("resize", checkOverflow);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-w-0 overflow-hidden relative flex items-center"
      style={{
        maskImage: isOverflowing
          ? "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)"
          : "none",
        WebkitMaskImage: isOverflowing
          ? "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)"
          : "none",
      }}
    >
      {isOverflowing ? (
        <div className="flex min-w-max animate-marquee-infinite">
          <div className={`pr-10 ${className}`}>{text}</div>
          <div className={`pr-10 ${className}`} aria-hidden="true">{text}</div>
        </div>
      ) : (
        <div ref={textRef} className={`truncate w-full ${className}`}>
          {text}
        </div>
      )}
    </div>
  );
};
