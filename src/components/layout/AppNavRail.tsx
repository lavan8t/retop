import React from 'react';
import {
  M3eNavRail,
  M3eNavRailToggle,
  M3eNavItem,
  M3eFab,
  M3eIcon,
  M3eIconButton,
  M3eTooltip,
} from '../attendance/m3eTags';
import { ViewType } from '../../types/vtop';
import { NAV_DESTINATIONS, isViewAvailableOnCampus } from '../../utils/routes';
import { currentCampus } from '../../utils/campus';

/**
 * Shared primary navigation: an M3E nav rail with inline labels that collapses
 * via M3E's compact state, reusing the destination map and `onSearch`.
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
  '--m3e-nav-rail-top-space': '4px',
  '--m3e-nav-rail-button-item-space': '2px',
  '--m3e-nav-rail-expanded-item-height': '48px',
  '--m3e-nav-rail-expanded-inline-padding': '8px',
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
    <M3eIcon
      slot="icon"
      name={destination.icon}
      variant="rounded"
      className="nav-rail-icon"
      filled={currentView === destination.view}
    />
    <span className="nav-rail-label">{destination.label}</span>
  </M3eNavItem>
);

export const AppNavRail: React.FC<AppNavRailProps> = ({
  currentView,
  onNavigate,
  onSearch,
  onVtop,
}) => {
  const [brandHover, setBrandHover] = React.useState(false);
  const campus = currentCampus();
  const destinations = NAV_DESTINATIONS.filter((d) =>
    isViewAvailableOnCampus(d.view, campus),
  );
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
        {/* Toggle sits in its own row above the brand control. */}
        <div className="nav-rail-top-row w-full min-h-10 pl-3 pr-2 flex items-center justify-end">
          <M3eIconButton
            toggle
            aria-label="Toggle navigation"
            title="Toggle navigation"
            className="shrink-0"
          >
            <M3eIcon name="menu" variant="rounded" />
            <M3eIcon slot="selected" name="menu_open" variant="rounded" />
            <M3eNavRailToggle for="app-nav-rail" />
          </M3eIconButton>
        </div>

        {/* Brand row: re. dissolves into VTOP in place on hover/focus. */}
        <div className="nav-rail-brand-row w-full min-h-10 pl-3 pr-2 flex items-center justify-start">
          <button
            type="button"
            aria-label={brandHover ? 'Open native VTOP' : 'retop home'}
            title={brandHover ? 'Open native VTOP' : 'retop'}
            onMouseEnter={() => setBrandHover(true)}
            onMouseLeave={() => setBrandHover(false)}
            onFocus={() => setBrandHover(true)}
            onBlur={() => setBrandHover(false)}
            onClick={brandHover ? onVtop : () => onNavigate('dashboard')}
            className="relative min-h-10 min-w-0 flex-1 flex items-center justify-start outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) cursor-pointer select-none"
          >
            <span className="relative block h-8 w-full">
              {/* re. signature */}
              <span
                className={`nav-rail-brand-glyph absolute inset-0 flex items-end justify-start leading-none transition-all duration-300 ease-out ${
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
                className={`nav-rail-brand-glyph font-['IDCardTimes',Times,serif]! absolute inset-0 flex items-center justify-start font-bold tracking-wide text-xl text-(--text-main) transition-all duration-300 ease-out ${
                  brandHover ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
                }`}
              >
                VTOP
              </span>
            </span>
          </button>
        </div>

        <div className="h-2 shrink-0" aria-hidden="true" />

        <M3eFab
          size="small"
          extended
          onClick={onSearch}
          aria-label="Search"
          title="Search"
        >
          <M3eIcon name="search" variant="rounded" />
          <span slot="label">Search</span>
        </M3eFab>

        <div className="h-3 shrink-0" aria-hidden="true" />

        {destinations.map((destination) => (
          <DestinationItem
            key={destination.view}
            destination={destination}
            currentView={currentView}
            onNavigate={onNavigate}
          />
        ))}
      </M3eNavRail>
    </>
  );
};
