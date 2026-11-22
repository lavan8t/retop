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
        {/* Custom brand swap: re. signature and VTOP trade places on hover. */}
        <button
          type="button"
          aria-label={brandHover ? 'Open native VTOP' : 'retop home'}
          title={brandHover ? 'Open native VTOP' : 'retop'}
          onMouseEnter={() => setBrandHover(true)}
          onMouseLeave={() => setBrandHover(false)}
          onFocus={() => setBrandHover(true)}
          onBlur={() => setBrandHover(false)}
          onClick={brandHover ? onVtop : () => onNavigate('dashboard')}
          className="relative min-h-14 w-full px-3 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) cursor-pointer select-none"
        >
          {/* Curved double-ended swap arrow, visible only on hover/focus */}
          <svg
            viewBox="0 0 24 40"
            aria-hidden="true"
            className={`absolute left-1 h-8 w-4 transition-all duration-200 ${
              brandHover ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <path
              d="M6 6 C 18 12, 18 28, 6 34 M6 6 l -3 4 M6 6 l 4 3 M6 34 l -3 -4 M6 34 l 4 -3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-(--text-muted)"
            />
          </svg>

          <span className="relative block h-8 w-full">
            {/* re. signature: top when idle, drops down on hover */}
            <span
              className={`absolute left-3 top-0 flex items-end leading-none transition-all duration-300 ease-out ${
                brandHover
                  ? 'translate-y-5 scale-90 opacity-70'
                  : 'translate-y-0 scale-100 opacity-100'
              }`}
            >
              <span className="font-expanded font-black text-xl italic lowercase text-(--text-main)">
                re
              </span>
              <span className="mb-0.5 -ml-0.5 h-2 w-2 rounded-full bg-(--accent-base)" />
            </span>

            {/* VTOP text: below-right and small when idle, grows at top on hover */}
            <span
              className={`font-vtop font-bold tracking-wide transition-all duration-300 ease-out ${
                brandHover
                  ? 'absolute left-3 top-0 text-xl text-(--text-main) opacity-100'
                  : 'absolute left-7 top-5 text-[11px] text-(--text-muted) opacity-80'
              }`}
            >
              VTOP
            </span>
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

        <div className="h-3 shrink-0" aria-hidden="true" />

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
        <div className="w-2 shrink-0" aria-hidden="true" />
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
