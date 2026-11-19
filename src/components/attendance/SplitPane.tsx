import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

/**
 * Two-pane layout with a draggable, keyboard-adjustable divider. Replaces the
 * web-component split pane so wide screens keep their resizable supporting/detail view.
 */
export const SplitPane = ({
  start,
  end,
  label,
  initial = 36,
  min = 26,
  max = 55,
}: {
  start: ReactNode;
  end: ReactNode;
  label: string;
  initial?: number;
  min?: number;
  max?: number;
}) => {
  const [value, setValue] = useState(initial);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  const moveTo = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setValue(clamp(((clientX - rect.left) / rect.width) * 100));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) moveTo(event.clientX);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let next = value;
    if (event.key === 'ArrowLeft') next = value - 2;
    else if (event.key === 'ArrowRight') next = value + 2;
    else if (event.key === 'Home') next = min;
    else if (event.key === 'End') next = max;
    else return;
    event.preventDefault();
    setValue(clamp(next));
  };

  return (
    <div ref={containerRef} className="flex h-full w-full">
      <div
        className="h-full min-w-0 overflow-hidden"
        style={{ width: `${value}%` }}
      >
        {start}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        className="w-2 shrink-0 cursor-col-resize touch-none bg-(--border-dim) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base)"
      />
      <div className="h-full min-w-0 flex-1 overflow-hidden">{end}</div>
    </div>
  );
};
