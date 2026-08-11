import React from "react";
import { Dropdown } from "../ui/Dropdown";

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
  align = "auto",
  className = "",
}: SettingsDropdownProps<T>) {
  const formattedOptions = options.map((o) => ({
    id: o.value,
    label: o.label,
  }));

  return (
    <Dropdown
      options={formattedOptions}
      selectedId={value}
      onChange={onChange}
      align={align}
      className={className}
    />
  );
}
