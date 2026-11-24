import React from 'react';
import { M3eButton, M3eButtonGroup } from '../attendance/m3eTags';

export type EventFilterType = 'all' | 'classes' | 'assignments' | 'events';

interface FilterChipsProps {
  eventFilter: EventFilterType;
  setEventFilter: (filter: EventFilterType) => void;
}

const OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Classes', value: 'classes' },
  { label: 'Tasks', value: 'assignments' },
  { label: 'Events', value: 'events' },
] as const;

export const FilterChips: React.FC<FilterChipsProps> = ({
  eventFilter,
  setEventFilter,
}) => (
  <div className="flex items-center justify-center shrink-0">
    <M3eButtonGroup variant="connected" size="small" aria-label="Event filter">
      {OPTIONS.map(({ label, value }) => (
        <M3eButton
          key={value}
          toggle
          value={value}
          selected={eventFilter === value}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            setEventFilter(value);
          }}
        >
          {label}
        </M3eButton>
      ))}
    </M3eButtonGroup>
  </div>
);
