import React from 'react';
import { formatSemesterShorthand } from '../../utils/formatting';
import { M3eFormField, M3eOption, M3eSelect } from '../attendance/m3eTags';

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
  /** Kept for API compatibility; m3e-select positions its own overlay. */
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
  disabled = false,
}: DropdownProps<T>) {
  const activeId = selectedId ?? value;

  const normalizedOptions: { id: T; label: string }[] = (options || []).map(
    (opt: any) => ({
      id: opt.id ?? opt.value,
      label: opt.label,
    }),
  );

  // Keep the old trigger label for ids that have no matching option.
  const selectableOptions =
    activeId && !normalizedOptions.some((o) => o.id === activeId)
      ? [
          {
            id: activeId,
            label: formatSemesterShorthand(String(activeId)),
          },
          ...normalizedOptions,
        ]
      : normalizedOptions;

  const handleChange = (e: any) => {
    const next = e.target.value as string;
    const match = normalizedOptions.find((o) => String(o.id) === next);
    if (match) onChange(match.id);
  };

  return (
    <M3eFormField
      className={className}
      style={
        {
          // Outlined is the default variant; its shape token is the one that applies here.
          '--m3e-outlined-form-field-container-shape': '9999px',
          '--m3e-form-field-container-color':
            'var(--md-sys-color-surface-container)',
          '--m3e-form-field-outline-color': 'var(--md-sys-color-outline)',
          '--m3e-form-field-color': 'var(--md-sys-color-on-surface)',
          '--m3e-form-field-font-size': '14px',
          '--m3e-form-field-line-height': '24px',
          '--m3e-form-field-width': '100%',
          marginTop: '4px',
        } as React.CSSProperties
      }
    >
      <label slot="label">{placeholder}</label>
      <M3eSelect
        disabled={disabled}
        value={activeId === undefined ? '' : String(activeId)}
        onChange={handleChange}
        style={
          {
            '--m3e-select-container-shape': '9999px',
            '--m3e-select-icon-size': '16px',
          } as React.CSSProperties
        }
      >
        <M3eOption value="">{placeholder}</M3eOption>
        {selectableOptions.map((opt) => (
          <M3eOption key={String(opt.id)} value={String(opt.id)}>
            {opt.label}
          </M3eOption>
        ))}
      </M3eSelect>
    </M3eFormField>
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
