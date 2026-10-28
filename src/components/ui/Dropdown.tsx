import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  KeyboardArrowDown,
  Check,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { getAppRoot } from '../../utils/bridge';
import { formatSemesterShorthand } from '../../utils/formatting';

export interface DropdownOption<T = string> {
  id?: T;
  value?: T;
  label: string;
  subLabel?: string;
}

interface DropdownProps<T extends string | number = string> {
  options: (
    DropdownOption<T> | { id?: T; value?: T; label: string; subLabel?: string }
  )[];
  selectedId?: T;
  value?: T;
  onChange: (id: T) => void;
  placeholder?: string;
  className?: string;
  align?: 'left' | 'right' | 'auto';
  disabled?: boolean;
}

export function Dropdown<T extends string | number = string>({
  options,
  selectedId,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  align = 'auto',
  disabled = false,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, minWidth: 180 });

  const activeId = selectedId ?? value;

  const normalizedOptions: { id: T; label: string; subLabel?: string }[] = (
    options || []
  ).map((opt: any) => ({
    id: opt.id ?? opt.value,
    label: opt.label,
    subLabel: opt.subLabel,
  }));

  const selectedIndex = normalizedOptions.findIndex((o) => o.id === activeId);
  const selectedOpt =
    selectedIndex >= 0 ? normalizedOptions[selectedIndex] : undefined;
  const displayLabel = selectedOpt
    ? selectedOpt.label
    : activeId
      ? formatSemesterShorthand(String(activeId))
      : placeholder;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let left = rect.left;
    if (
      align === 'right' ||
      (align === 'auto' && rect.left + 240 > window.innerWidth)
    ) {
      left = rect.right - 240;
    }
    left = Math.max(12, Math.min(left, window.innerWidth - 252));

    let top = rect.bottom + 6;
    if (rect.bottom + 260 > window.innerHeight && rect.top > 260) {
      top = rect.top - 240;
    }

    setMenuPos({ top, left, minWidth: Math.max(rect.width, 200) });
  }, [align]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, selectedIndex, updatePosition]);

  // Click outside listener with Shadow DOM composedPath support
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

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [isOpen]);

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [isOpen, highlightedIndex]);

  const selectOption = (opt: { id: T; label: string }) => {
    onChange(opt.id);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (
        e.key === 'ArrowDown' ||
        e.key === 'ArrowUp' ||
        e.key === 'Enter' ||
        e.key === ' '
      ) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const count = normalizedOptions.length;
    if (count === 0) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % count);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + count) % count);
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(count - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < count) {
          selectOption(normalizedOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className={`flex items-center justify-between gap-2 px-3.5 py-2 rounded-full bg-(--bg-surface) border border-(--border-dim)/60 text-(--text-main) text-xs font-bold font-mono transition-all cursor-pointer select-none hover:bg-(--bg-highlight) shrink-0 focus:outline-none focus:ring-2 focus:ring-(--accent-base)/50 leading-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        <span className="truncate max-w-44 leading-none pt-px">
          {displayLabel}
        </span>
        <KeyboardArrowDown
          className={`w-4 h-4 text-(--accent-base) shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              minWidth: `${menuPos.minWidth}px`,
            }}
            className="z-[999999] max-h-64 overflow-y-auto custom-scrollbar p-1.5 rounded-2xl bg-(--bg-surface) border-2 border-(--border-main) popup-shadow shadow-2xl flex flex-col gap-1 text-(--text-main) animate-popup-open focus:outline-none"
          >
            {normalizedOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-(--text-muted) text-center leading-none">
                No options
              </div>
            ) : (
              normalizedOptions.map((opt, idx) => {
                const isSelected = opt.id === activeId;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={String(opt.id)}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectOption(opt);
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer outline-none select-none leading-none ${
                      isSelected
                        ? 'bg-(--accent-base) text-(--text-inverse)'
                        : isHighlighted
                          ? 'bg-(--bg-highlight) text-(--text-main)'
                          : 'text-(--text-main) hover:bg-(--bg-highlight)'
                    }`}
                  >
                    <span className="truncate leading-none pt-px">
                      {opt.label}
                    </span>
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

export const SemesterDropdown = ({
  semesters,
  selectedId,
  onChange,
  align = 'auto',
}: any) => {
  const formattedSemesters = (semesters || []).map((sem: any) => ({
    id: sem.id,
    label: formatSemesterShorthand(sem.label || sem.id),
    subLabel: sem.label,
  }));

  return (
    <Dropdown
      options={formattedSemesters}
      selectedId={selectedId}
      onChange={onChange}
      align={align}
      placeholder="Select Semester"
    />
  );
};

export const ClassGroupDropdown = ({ groups, selectedId, onChange }: any) => {
  return (
    <Dropdown
      options={groups || []}
      selectedId={selectedId}
      onChange={onChange}
      placeholder="Select Group"
    />
  );
};

export function SettingsDropdown<T extends string | number>({
  options,
  value,
  onChange,
  align = 'auto',
  className = '',
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
  align?: 'left' | 'right' | 'auto';
  colorHex?: (val: T) => string;
}) {
  return (
    <Dropdown
      options={options}
      selectedId={value}
      onChange={onChange}
      align={align}
      className={className}
    />
  );
}
