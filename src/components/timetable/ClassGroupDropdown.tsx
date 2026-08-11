import React from "react";
import { Dropdown } from "../ui/Dropdown";

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
