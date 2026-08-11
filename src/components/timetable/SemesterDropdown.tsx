import React from "react";
import { Dropdown } from "../ui/Dropdown";
import { formatSemesterShorthand } from "../../utils/formatting";

export const SemesterDropdown = ({ semesters, selectedId, onChange, align = "auto" }: any) => {
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
