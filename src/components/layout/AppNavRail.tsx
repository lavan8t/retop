import React from 'react';
import {
  M3eNavRail,
  M3eNavItem,
  M3eNavBar,
  M3eFab,
  M3eIcon,
  M3eIconButton,
  M3eTooltip,
} from '../attendance/m3eTags';
import { ViewType } from '../../types/vtop';
import { NAV_DESTINATIONS, getNavBarDestinations } from '../../utils/routes';

/**
 * Shared primary navigation. Wide: an expanded M3E nav rail with inline labels.
 * Narrow: a bottom M3E nav bar. Both reuse the same destination map and open the
 * existing search UI through `onSearch`.
 */
export interface AppNavRailProps {
  currentView: string;
  onNavigate: (view: ViewType) => void;
  onSearch: () => void;
  onVtop: () => void;
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
  onVtop,
}) => {
  const [brandHover, setBrandHover] = React.useState(false);

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
        {/* One brand control: shows retop, becomes VTOP on hover; tap opens VTOP. */}
        <button
          type="button"
          aria-label={brandHover ? 'Open native VTOP' : 'retop'}
          title={brandHover ? 'Open native VTOP' : 'retop'}
          onMouseEnter={() => setBrandHover(true)}
          onMouseLeave={() => setBrandHover(false)}
          onFocus={() => setBrandHover(true)}
          onBlur={() => setBrandHover(false)}
          onClick={onVtop}
          className="min-h-12 w-full flex items-center gap-3 px-3 rounded-full text-(--md-sys-color-on-surface-variant) hover:bg-(--md-sys-color-surface-container-high) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) cursor-pointer transition-colors"
        >
          <M3eIcon name={brandHover ? 'language' : 'star'} />
          <span
            className={
              brandHover
                ? 'font-vtop font-bold text-sm'
                : 'font-expanded font-black text-sm italic lowercase'
            }
          >
            {brandHover ? 'VTOP' : 'retop'}
          </span>
        </button>

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
