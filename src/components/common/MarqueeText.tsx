import React, { useEffect, useRef, useState } from "react";

interface MarqueeTextProps {
  text: string;
  className?: string;
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({ text, className = "" }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        const isOw = textRef.current.scrollWidth > textRef.current.clientWidth + 2;
        setIsOverflowing(isOw);
        if (isOw) {
          textRef.current.style.setProperty(
            "--scroll-dist",
            `-${textRef.current.scrollWidth - textRef.current.clientWidth}px`
          );
        }
      }
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text]);

  return (
    <div
      className="flex-1 min-w-0 overflow-hidden relative"
      style={{
        maskImage: isOverflowing
          ? "linear-gradient(to right, black 85%, transparent 100%)"
          : "none",
        WebkitMaskImage: isOverflowing
          ? "linear-gradient(to right, black 85%, transparent 100%)"
          : "none",
      }}
    >
      <div
        ref={textRef}
        className={`whitespace-nowrap inline-block ${
          isOverflowing ? "animate-marquee-auto" : ""
        } ${className}`}
      >
        {text}
      </div>
    </div>
  );
};
