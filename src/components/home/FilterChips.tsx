import React from 'react';
import { SegmentedControl } from '../ui/SegmentedControl';

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
  <div className="flex items-center justify-center gap-0.5 shrink-0">
    <SegmentedControl
      ariaLabel="Event filter"
      options={OPTIONS.map((o) => ({ ...o }))}
      value={eventFilter}
      onChange={(value) => setEventFilter(value as EventFilterType)}
    />
  </div>
);
