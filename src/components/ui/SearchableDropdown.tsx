import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  KeyboardArrowDown,
  Check,
  Search,
  Close,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { getAppRoot } from "../../utils/bridge";

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableDropdownProps {
  label?: string;
  options: SearchableOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = "— Select —",
  searchPlaceholder = "Search...",
  disabled = false,
  loading = false,
  error,
  helperText,
  required = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 240 });

  // Selected Option
  const selectedOpt = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.subLabel && o.subLabel.toLowerCase().includes(q)),
    );
  }, [options, searchQuery]);

  // Position update
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let left = rect.left;
    let width = Math.max(rect.width, 240);

    // Keep within window
    if (left + width > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - width - 16);
    }

    let top = rect.bottom + 6;
    // If overflowing bottom, show above trigger
    if (rect.bottom + 300 > window.innerHeight && rect.top > 300) {
      top = rect.top - 280;
    }

    setMenuPos({ top, left, width });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      setSearchQuery("");
      const selIdx = filteredOptions.findIndex((o) => o.value === value);
      setHighlightedIndex(selIdx >= 0 ? selIdx : 0);

      // Focus search input after modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [isOpen, value, updatePosition]);

  // Outside click listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const path = e.composedPath ? e.composedPath() : [e.target as Node];
      const isInsideTrigger =
        triggerRef.current &&
        (triggerRef.current.contains(e.target as Node) ||
          path.includes(triggerRef.current));
      const isInsideMenu =
        menuRef.current &&
        (menuRef.current.contains(e.target as Node) ||
          path.includes(menuRef.current));

      if (!isInsideTrigger && !isInsideMenu) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("touchstart", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("touchstart", handleClickOutside, true);
    };
  }, [isOpen]);

  // Auto scroll highlighted item
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [isOpen, highlightedIndex]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const count = filteredOptions.length;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (count > 0 ? (prev + 1) % count : -1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          count > 0 ? (prev - 1 + count) % count : -1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < count) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-[11px] font-bold text-(--text-muted) uppercase tracking-wide flex items-center justify-between">
          <span className="flex items-center gap-1">
            {label}
            {required && <span className="text-red-400 font-bold">*</span>}
          </span>
          {loading && (
            <span className="text-(--accent-base) animate-pulse normal-case tracking-normal font-normal text-[10px]">
              loading…
            </span>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading || options.length === 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full min-h-10 px-3.5 py-2 rounded-2xl bg-(--bg-main) border text-left text-sm font-medium transition-all flex items-center justify-between gap-2 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-(--accent-base)/40 ${
          error
            ? "border-red-500/70 focus:border-red-500"
            : isOpen
              ? "border-(--accent-base) ring-2 ring-(--accent-base)/30"
              : "border-(--border-dim) hover:border-(--border-dim)/80 focus:border-(--accent-base)"
        } ${
          disabled || loading || options.length === 0
            ? "opacity-50 cursor-not-allowed bg-(--bg-main)/40"
            : ""
        }`}>
        <span
          className={`truncate flex-1 ${
            selectedOpt ? "text-(--text-main) font-medium" : "text-(--text-muted)/70"
          }`}>
          {selectedOpt ? selectedOpt.label : placeholder}
        </span>

        <KeyboardArrowDown
          className={`w-4 h-4 text-(--text-muted) shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-(--accent-base)" : ""
          }`}
        />
      </button>

      {/* Inline Feedback / Error */}
      {error && <span className="text-[10px] font-bold text-red-400">{error}</span>}
      {!error && helperText && (
        <span className="text-[10px] text-(--text-muted)">{helperText}</span>
      )}

      {/* Dropdown Menu Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            style={{
              position: "fixed",
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              width: `${menuPos.width}px`,
            }}
            className="z-[999999] max-h-72 overflow-hidden rounded-2xl bg-(--bg-surface) border border-(--border-dim) popup-shadow shadow-2xl flex flex-col text-(--text-main) animate-popup-open focus:outline-none">
            {/* Search Input Field */}
            <div className="p-2 border-b border-(--border-dim)/50 bg-(--bg-main)/50 flex items-center gap-2">
              <Search className="w-4 h-4 text-(--text-muted) shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-xs font-medium text-(--text-main) placeholder:text-(--text-muted)/60 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-(--text-muted) hover:text-(--text-main) p-0.5 rounded-full cursor-pointer">
                  <Close className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Options List */}
            <div className="overflow-y-auto max-h-56 p-1.5 custom-scrollbar flex flex-col gap-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-xs text-(--text-muted) text-center flex flex-col items-center gap-1">
                  <span>No matching options</span>
                  {searchQuery && (
                    <span className="text-[10px] text-(--text-muted)/70">
                      Try different search keywords
                    </span>
                  )}
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <button
                      key={opt.value}
                      ref={(el) => {
                        itemRefs.current[idx] = el;
                      }}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between gap-2 cursor-pointer outline-none select-none ${
                        isSelected
                          ? "bg-(--accent-base) text-(--text-inverse) font-bold"
                          : isHighlighted
                            ? "bg-(--bg-highlight) text-(--text-main)"
                            : "text-(--text-main) hover:bg-(--bg-highlight)"
                      }`}>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate">{opt.label}</span>
                        {opt.subLabel && (
                          <span
                            className={`text-[10px] truncate ${
                              isSelected
                                ? "text-(--text-inverse)/80"
                                : "text-(--text-muted)"
                            }`}>
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          getAppRoot() || document.body,
        )}
    </div>
  );
};
