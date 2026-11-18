import { ReactNode } from 'react';
import { selectableRowProps } from './SelectableRow';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  onClick?: (e?: any) => void;
  onMouseEnter?: (e?: any) => void;
  onMouseLeave?: (e?: any) => void;
  clickable?: boolean;
  borderClass?: string;
  /** Accessible name when the card content is not self-describing. */
  label?: string;
}

export const Card = ({
  children,
  className = '',
  onClick,
  clickable = false,
  borderClass = 'border-(--border-main)',
  label,
  ...rest
}: CardProps) => {
  const isClickable = clickable || !!onClick;

  // A div adapter keeps cards with nested controls valid HTML while the
  // selectable-row module still owns role, focus, target size and keys.
  const row = isClickable
    ? selectableRowProps({
        onActivate: () => onClick?.(),
        label,
        className: '',
      })
    : null;

  return (
    <div
      {...(row ? { ...row, role: row.role || 'button' } : {})}
      className={`
        border-4 ${borderClass} shadow-none transition-all duration-200
        ${isClickable ? 'cursor-pointer active:translate-y-0 active:shadow-(--brutal-shadow-active)' : ''}
        ${row ? row.className : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
};
