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
import { VitEmblemLoader } from '../common/VitEmblemLoader';
import { currentCampus } from '../../utils/campus';

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
  const isVitap = currentCampus() === 'vitap';

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
        {/* Monochrome campus emblem, above the brand control. */}
        <div
          className="flex h-12 items-center justify-center"
          aria-hidden="true"
        >
          <VitEmblemLoader
            size={32}
            finishing
            className={isVitap ? '[color:#a32450]!' : 'text-(--text-muted)!'}
          />
        </div>

        {/* Brand: re. dissolves into VTOP in place on hover/focus. */}
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
          <span className="relative block h-8 w-full">
            {/* re. signature */}
            <span
              className={`absolute inset-0 flex items-end justify-center leading-none transition-all duration-300 ease-out ${
                brandHover ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
              }`}
            >
              <span className="font-expanded font-black text-xl italic lowercase text-(--text-main)">
                re
              </span>
              <span className="mb-0.5 -ml-0.5 h-2 w-2 rounded-full bg-(--accent-base)" />
            </span>

            {/* VTOP in Times New Roman, same spot as re. */}
            <span
              className={`font-['IDCardTimes',Times,serif]! absolute inset-0 flex items-center justify-center font-bold tracking-wide text-xl text-(--text-main) transition-all duration-300 ease-out ${
                brandHover ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
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
