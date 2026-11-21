import React from 'react';
import {
  M3eNavRail,
  M3eNavItem,
  M3eNavBar,
  M3eFab,
  M3eIcon,
  M3eIconButton,
} from '../attendance/m3eTags';
import { Semester, ViewType } from '../../types/vtop';
import { NAV_DESTINATIONS, getNavBarDestinations } from '../../utils/routes';
import { SemesterDropdown } from '../ui/Dropdown';

/**
 * Shared primary navigation. Wide: an M3E nav rail (96px compact below 960px,
 * 220px expanded above it). Narrow: a bottom M3E nav bar. Both reuse the same
 * destination map and open the existing search UI through `onSearch`.
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
  return (
    <>
      {/* Wide: M3E nav rail. `auto` = compact (96px) <960px, expanded (220px) >=960px. */}
      <M3eNavRail
        className="hidden md:block fixed inset-y-0 left-0 z-[60]"
        mode="auto"
        aria-label="Primary navigation"
      >
        <M3eFab
          size="small"
          onClick={onSearch}
          aria-label="Search"
          title="Search"
        >
          <M3eIcon name="search" />
        </M3eFab>

        {NAV_DESTINATIONS.map((destination) => (
          <DestinationItem
            key={destination.view}
            destination={destination}
            currentView={currentView}
            onNavigate={onNavigate}
          />
        ))}

        {/* Bottom actions: re. brand, VTOP, sync, profile, semester. */}
        <div
          className="flex flex-col items-center gap-1 w-full pt-3 mt-auto border-t border-(--border-dim)"
          style={{ alignSelf: 'stretch' }}
        >
          <button
            type="button"
            aria-label="retop home"
            title="retop home"
            onClick={() => onNavigate('dashboard')}
            className="min-w-12 min-h-12 flex items-end justify-center pb-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) cursor-pointer"
          >
            <span className="font-expanded font-black text-2xl italic lowercase leading-none text-(--text-main)">
              re
            </span>
            <span
              aria-hidden="true"
              className="ml-[-1.5px] mb-0.5 w-2.5 h-2.5 rounded-full bg-(--accent-base) shrink-0"
            />
          </button>

          <M3eIconButton
            aria-label="Open native VTOP"
            title="Open native VTOP"
            onClick={onVtop}
          >
            <M3eIcon name="language" />
          </M3eIconButton>

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
            <div className="hidden min-[960px]:block w-full px-1 pt-1">
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
