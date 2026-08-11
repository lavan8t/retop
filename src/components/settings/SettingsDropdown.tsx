import React, { useState, useRef, useEffect } from "react";
import { KeyboardArrowDown, Check } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";


interface DropdownOption<T> {
  label: string;
  value: T;
}

interface SettingsDropdownProps<T> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
  align?: "left" | "right" | "auto";
  colorHex?: (val: T) => string;
}

export function SettingsDropdown<T extends string | number>({
  options,
  value,
  onChange,
  className = "",
  align = "auto",
  colorHex,
}: SettingsDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuAlign, setMenuAlign] = useState<"left" | "right">("left");
  const [menuVAlign, setMenuVAlign] = useState<"top" | "bottom">("bottom");
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  const updateAlignment = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      
      if (align === "left" || align === "right") {
        setMenuAlign(align);
      } else if (rect.left > window.innerWidth / 2 || rect.right > window.innerWidth - 120) {
        setMenuAlign("right");
      } else {
        setMenuAlign("left");
      }

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 220 && spaceAbove > spaceBelow) {
        setMenuVAlign("top");
      } else {
        setMenuVAlign("bottom");
      }
    }
  };

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    updateAlignment();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  const toggleOpen = () => {
    if (!isOpen) updateAlignment();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const isTop = menuVAlign === "top";
  const isRight = menuAlign === "right";

  const originClass = isTop
    ? isRight ? "origin-bottom-right" : "origin-bottom-left"
    : isRight ? "origin-top-right" : "origin-top-left";

  const positionClass = isTop
    ? "bottom-full pb-1.5"
    : "top-full pt-1.5";

  const alignmentClass = isRight ? "right-0" : "left-0";

  return (
    <div
      ref={containerRef}
      className={`relative z-[999999] ${className}`}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className="flex items-center justify-between gap-3 bg-(--bg-highlight) hover:bg-(--bg-surface) border-2 border-(--border-main) px-4 py-2.5 rounded-2xl text-(--text-main) font-bold text-xs md:text-sm transition-all cursor-pointer min-w-48 group"
      >
        <div className="flex items-center gap-2.5 truncate">
          {colorHex && (
            <span
              className="w-4 h-4 rounded-full shrink-0 border border-white/30 shadow-xs"
              style={{ backgroundColor: colorHex(selectedOption.value) }}
            />
          )}
          <span className="truncate">{selectedOption?.label}</span>
        </div>
        <KeyboardArrowDown
          className={`w-4 h-4 text-(--accent-base) transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

        {isOpen && (
          <div
            className={`absolute z-[999999] min-w-48 ${positionClass} ${alignmentClass} ${originClass} transition-all duration-200`}
          >
            <div className="w-full bg-(--bg-card) border-2 border-(--border-main) rounded-2xl py-1.5 overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs md:text-sm font-bold flex items-center justify-between hover:bg-(--bg-highlight) transition-colors cursor-pointer ${
                      isSelected
                        ? "text-(--accent-base) bg-(--bg-highlight)/50"
                        : "text-(--text-main)"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {colorHex && (
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30 shadow-xs"
                          style={{ backgroundColor: colorHex(opt.value) }}
                        />
                      )}
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-(--accent-base)" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
}
