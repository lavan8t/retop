import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { KeyboardArrowDown, Check } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { getAppRoot } from "../../utils/bridge";
import { formatSemesterShorthand } from "../../utils/formatting";

export interface DropdownOption<T = string> {
  id: T;
  label: string;
  subLabel?: string;
}

interface DropdownProps<T extends string | number = string> {
  options: DropdownOption<T>[] | { id: string; label: string }[];
  selectedId: T;
  onChange: (id: T) => void;
  placeholder?: string;
  className?: string;
  align?: "left" | "right" | "auto";
  disabled?: boolean;
}

export function Dropdown<T extends string | number = string>({
  options,
  selectedId,
  onChange,
  placeholder = "Select...",
  className = "",
  align = "auto",
  disabled = false,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, minWidth: 180 });

  const normalizedOptions: DropdownOption<T>[] = options.map((opt: any) => ({
    id: opt.id ?? opt.value,
    label: opt.label,
    subLabel: opt.subLabel,
  }));

  const selectedOpt = normalizedOptions.find((o) => o.id === selectedId);
  const displayLabel = selectedOpt
    ? selectedOpt.label
    : selectedId
      ? formatSemesterShorthand(String(selectedId))
      : placeholder;

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let left = rect.left;
      if (align === "right" || (align === "auto" && rect.left + 240 > window.innerWidth)) {
        left = rect.right - 240;
      }
      left = Math.max(12, Math.min(left, window.innerWidth - 252));

      let top = rect.bottom + 6;
      if (rect.bottom + 260 > window.innerHeight && rect.top > 260) {
        top = rect.top - 240;
      }

      setMenuPos({ top, left, minWidth: Math.max(rect.width, 200) });
    }
  }, [isOpen, align]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((v) => !v)}
        className={`flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-full bg-(--bg-surface) border border-(--border-dim)/60 text-(--text-main) text-xs font-bold font-mono transition-all cursor-pointer select-none hover:bg-(--bg-highlight) shrink-0 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${className}`}
      >
        <span className="truncate max-w-44">
          {displayLabel}
        </span>
        <KeyboardArrowDown
          className={`w-4 h-4 text-(--accent-base) shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              minWidth: `${menuPos.minWidth}px`,
            }}
            className="z-[999999] max-h-64 overflow-y-auto custom-scrollbar p-1.5 rounded-2xl bg-(--bg-surface) border-2 border-(--border-main) popup-shadow shadow-2xl flex flex-col gap-1 text-(--text-main) animate-popup-open"
          >
            {normalizedOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-(--text-muted) text-center">
                No options
              </div>
            ) : (
              normalizedOptions.map((opt) => {
                const isSelected = opt.id === selectedId;
                return (
                  <button
                    key={String(opt.id)}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-(--accent-base) text-(--text-inverse)"
                        : "text-(--text-main) hover:bg-(--bg-highlight)"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>,
          getAppRoot() || document.body,
        )}
    </>
  );
}
