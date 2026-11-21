import React from 'react';
import {
  M3eNavRail,
  M3eNavRailToggle,
  M3eNavItem,
  M3eNavBar,
  M3eFab,
  M3eIcon,
  M3eIconButton,
  M3eTooltip,
} from '../attendance/m3eTags';
import { Semester, ViewType } from '../../types/vtop';
import { NAV_DESTINATIONS, getNavBarDestinations } from '../../utils/routes';
import { SemesterDropdown } from '../ui/Dropdown';

/**
 * Shared primary navigation. Wide: an expanded M3E nav rail with inline labels.
 * Narrow: a bottom M3E nav bar. Both reuse the same destination map and open the
 * existing search UI through `onSearch`.
 */
export interface AppNavRailProps {
  currentView: string;
  onNavigate: (view: ViewType) => void;
  onSearch: () => void;
  onSync: () => void;
  isSyncing: boolean;
  showProfileMenu: boolean;
  onProfileClick: () => void;
  onVtop: () => void;
  semesters: Semester[];
  selectedSem?: string;
  onSemesterChange?: (id: string) => void;
}

/** M3E tokens bound to Material 3 color roles (see the nav-rail color roles). */
const navColorTokens = {
  '--m3e-nav-bar-container-color': 'var(--md-sys-color-surface-container)',
  '--m3e-nav-item-active-container-color':
    'var(--md-sys-color-secondary-container)',
  '--m3e-nav-item-active-icon-color':
    'var(--md-sys-color-on-secondary-container)',
  '--m3e-nav-item-active-label-text-color':
    'var(--md-sys-color-on-secondary-container)',
  '--m3e-nav-item-inactive-icon-color':
    'var(--md-sys-color-on-surface-variant)',
  '--m3e-nav-item-inactive-label-text-color':
    'var(--md-sys-color-on-surface-variant)',
} as React.CSSProperties;

const DestinationItem = ({
  destination,
  currentView,
  onNavigate,
}: {
  destination: (typeof NAV_DESTINATIONS)[number];
  currentView: string;
  onNavigate: (view: ViewType) => void;
}) => (
  <M3eNavItem
    selected={currentView === destination.view}
    onClick={() => onNavigate(destination.view)}
    aria-label={destination.label}
  >
    <M3eIcon slot="icon" name={destination.icon} />
    {destination.label}
  </M3eNavItem>
);

export const AppNavRail: React.FC<AppNavRailProps> = ({
  currentView,
  onNavigate,
  onSearch,
  onSync,
  isSyncing,
  showProfileMenu,
  onProfileClick,
  onVtop,
  semesters,
  selectedSem,
  onSemesterChange,
}) => {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const retopId = `rail-retop-${uid}`;
  const vtopId = `rail-vtop-${uid}`;

  return (
    <>
      {/* Wide: expanded rail. `mode="expanded"` keeps icon + label on one line. */}
      <M3eNavRail
        id="app-nav-rail"
        className="hidden md:block fixed inset-y-0 left-0 z-[60]"
        mode="expanded"
        aria-label="Primary navigation"
        style={navColorTokens}
      >
        {/* Toggle at top, matching the documented nav-rail anatomy. */}
        <M3eIconButton
          toggle
          aria-label="Toggle navigation"
          title="Toggle navigation"
        >
          <M3eIcon name="menu" />
          <M3eIcon slot="selected" name="menu_open" />
          <M3eNavRailToggle for="app-nav-rail" />
        </M3eIconButton>

        {/* Brand/context items above the search FAB. Labels are inline in the
            expanded rail; tooltips keep them readable on hover. */}
        <button
          id={retopId}
          type="button"
          aria-label="retop home"
          onClick={() => onNavigate('dashboard')}
          className="min-h-12 w-full flex items-center gap-3 px-3 rounded-full text-(--md-sys-color-on-surface-variant) hover:bg-(--md-sys-color-surface-container-high) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) cursor-pointer transition-colors"
        >
          <M3eIcon name="star" />
          <span className="font-expanded font-black text-sm italic lowercase">
            retop
          </span>
        </button>
        <M3eTooltip for={retopId}>retop</M3eTooltip>

        <button
          id={vtopId}
          type="button"
          aria-label="Open native VTOP"
          onClick={onVtop}
          className="min-h-12 w-full flex items-center gap-3 px-3 rounded-full text-(--md-sys-color-on-surface-variant) hover:bg-(--md-sys-color-surface-container-high) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) cursor-pointer transition-colors"
        >
          <M3eIcon name="language" />
          <span className="font-vtop font-bold text-sm">VTOP</span>
        </button>
        <M3eTooltip for={vtopId}>VTOP</M3eTooltip>

        <M3eFab
          size="small"
          extended
          onClick={onSearch}
          aria-label="Search"
          title="Search"
        >
          <M3eIcon name="search" />
          <span slot="label">Search</span>
        </M3eFab>

        {NAV_DESTINATIONS.map((destination) => (
          <DestinationItem
            key={destination.view}
            destination={destination}
            currentView={currentView}
            onNavigate={onNavigate}
          />
        ))}

        {/* Remaining actions stay at the bottom of the rail. */}
        <div
          className="flex flex-col items-center gap-1 w-full pt-3 mt-auto border-t border-(--border-dim)"
          style={{ alignSelf: 'stretch' }}
        >
          <M3eIconButton
            aria-label={isSyncing ? 'Syncing' : 'Sync now'}
            title={isSyncing ? 'Syncing' : 'Sync now'}
            aria-busy={isSyncing}
            disabled={isSyncing}
            onClick={onSync}
          >
            <M3eIcon name="sync" />
          </M3eIconButton>

          <M3eIconButton
            id="rail-profile-btn"
            data-profile-trigger="true"
            aria-label="Toggle profile menu"
            title="Profile"
            aria-expanded={showProfileMenu}
            onClick={onProfileClick}
          >
            <M3eIcon name="person" />
          </M3eIconButton>

          {semesters.length > 0 && (
            <div className="w-full px-1 pt-1">
              <SemesterDropdown
                semesters={semesters}
                selectedId={selectedSem}
                onChange={onSemesterChange}
                align="right"
              />
            </div>
          )}
        </div>
      </M3eNavRail>

      {/* Narrow: bottom navigation bar (below md). */}
      <M3eNavBar
        className="md:hidden fixed bottom-0 inset-x-0 z-[60]"
        mode="compact"
        aria-label="Primary navigation"
        style={navColorTokens}
      >
        <M3eFab
          size="small"
          onClick={onSearch}
          aria-label="Search"
          title="Search"
        >
          <M3eIcon name="search" />
        </M3eFab>
        {getNavBarDestinations().map((destination) => (
          <DestinationItem
            key={destination.view}
            destination={destination}
            currentView={currentView}
            onNavigate={onNavigate}
          />
        ))}
      </M3eNavBar>
    </>
  );
};
