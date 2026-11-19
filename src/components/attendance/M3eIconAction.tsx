import { M3eIconButton, M3eTooltip } from './m3eTags';
import { useId, type ReactNode } from 'react';

/**
 * Icon-only action with its required accessible name, tooltip and M3E states.
 * Visual size comes from M3E's 48dp touch target, not a bespoke button.
 */
export const M3eIconAction = ({
  icon,
  label,
  onClick,
  disabled = false,
  variant = 'standard',
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: string;
}) => {
  const id = `att-action-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <>
      <M3eIconButton
        id={id}
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        variant={variant}
      >
        {icon}
      </M3eIconButton>
      <M3eTooltip for={id}>{label}</M3eTooltip>
    </>
  );
};
