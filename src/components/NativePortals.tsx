import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  School,
  Badge,
  FamilyRestroom,
  WorkspacePremium,
  Bolt,
  Visibility,
  Home,
  OpenInNew,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

// Inject a React element into a native DOM container via portal
const PortalInject: React.FC<{
  container: HTMLElement;
  children: React.ReactNode;
}> = ({ container, children }) => {
  return createPortal(children, container);
};

// Hide original element and create a sibling container for portal
const PortalReplacer: React.FC<{
  target: Element;
  children: React.ReactNode;
  wrapperClass?: string;
  wrapperStyle?: React.CSSProperties;
}> = ({ target, children, wrapperClass, wrapperStyle }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const originalDisplay = (target as HTMLElement).style.display;
    (target as HTMLElement).style.display = "none";

    const div = document.createElement("div");
    if (wrapperClass) div.className = wrapperClass;
    Object.assign(div.style, wrapperStyle || {});

    target.parentNode?.insertBefore(div, target.nextSibling);
    setContainer(div);

    return () => {
      (target as HTMLElement).style.display = originalDisplay;
      div.remove();
    };
  }, [target, wrapperClass, wrapperStyle]);

  if (!container) return null;
  return createPortal(children, container);
};

interface PortalTargets {
  // Card icon containers — inject icon INTO these divs
  stdIconContainer: HTMLElement | null;
  empIconContainer: HTMLElement | null;
  parentIconContainer: HTMLElement | null;
  alumniIconContainer: HTMLElement | null;
  // Bolt replacements
  boltContainers: HTMLElement[];
  // Spotlight More... button
  moreBtnContainer: HTMLElement | null;
  // Eye icon
  eyeIcon: Element | null;
  // Home links
  homeLinks: Element[];
}

export const NativePortals: React.FC = () => {
  const [targets, setTargets] = useState<PortalTargets>({
    stdIconContainer: null,
    empIconContainer: null,
    parentIconContainer: null,
    alumniIconContainer: null,
    boltContainers: [],
    moreBtnContainer: null,
    eyeIcon: null,
    homeLinks: [],
  });
  const injectedRef = useRef(false);

  useEffect(() => {
    const inject = () => {
      if (injectedRef.current) return;

      // Make card container clickable anywhere
      const attachCardClick = (formId: string) => {
        const form = document.getElementById(formId);
        if (!form) return;
        const card = (form.closest(".cardStudent, .cardEmployee, .cardParent, .cardAlumni, .card") || form) as HTMLElement;
        if (card) {
          card.style.cursor = "pointer";
          card.onclick = (e) => {
            e.preventDefault();
            (window as any).submitForm?.(formId);
          };
        }
      };

      attachCardClick("stdForm");
      attachCardClick("empForm");
      attachCardClick("parentForm");
      attachCardClick("alumniForm");

      // Card icons: find .w-50 inside each form, hide native img, use container
      const stdW50 = document.querySelector("#stdForm .w-50") as HTMLElement;
      const empW50 = document.querySelector("#empForm .w-50") as HTMLElement;
      const parentW50 = document.querySelector("#parentForm .w-50") as HTMLElement;
      const alumniW50 = document.querySelector("#alumniForm .w-50") as HTMLElement;

      // Hide native images
      document.querySelectorAll("#stdForm img, #empForm img, #parentForm img, #alumniForm img").forEach(img => {
        (img as HTMLElement).style.display = "none";
      });

      // Bolts: hide native, create containers
      const nativeBolts = document.querySelectorAll(".fa-bolt");
      const boltContainers: HTMLElement[] = [];
      nativeBolts.forEach(bolt => {
        (bolt as HTMLElement).style.display = "none";
        const div = document.createElement("span");
        div.className = "retop-spotlight-bolt";
        bolt.parentNode?.insertBefore(div, bolt);
        boltContainers.push(div);
      });

      // Spotlight More... button
      const moreBtn = document.querySelector(".spotlightHeader button, .spotlightHeader a, .spotlightHeader .btn-link") as HTMLElement;
      let moreBtnContainer: HTMLElement | null = null;
      if (moreBtn) {
        moreBtn.textContent = ""; // Clear native "More..." text
        moreBtnContainer = moreBtn;
      }

      const eyeIcon = document.querySelector("#passwordIcon");
      const homeLinks = Array.from(
        document.querySelectorAll('a[href="javascript:gotoHome()"]')
      );

      if (stdW50 || empW50 || parentW50 || alumniW50 || boltContainers.length > 0) {
        injectedRef.current = true;

        // Create icon container divs inside .w-50
        const makeContainer = (parent: HTMLElement | null): HTMLElement | null => {
          if (!parent) return null;
          const existing = parent.querySelector(".retop-inline-icon");
          if (existing) return existing as HTMLElement;
          const div = document.createElement("div");
          div.className = "retop-inline-icon";
          parent.appendChild(div);
          return div;
        };

        setTargets({
          stdIconContainer: makeContainer(stdW50),
          empIconContainer: makeContainer(empW50),
          parentIconContainer: makeContainer(parentW50),
          alumniIconContainer: makeContainer(alumniW50),
          boltContainers,
          moreBtnContainer,
          eyeIcon,
          homeLinks,
        });

        console.log("[retop] NativePortals injected icons & click handlers");
      }
    };

    // Try immediately
    inject();

    // Retry after short delay if DOM not ready
    if (!injectedRef.current) {
      const timer = setTimeout(inject, 500);
      const timer2 = setTimeout(inject, 1500);
      return () => { clearTimeout(timer); clearTimeout(timer2); };
    }
  }, []);

  return (
    <>
      {/* Bolt Icons */}
      {targets.boltContainers.map((container, i) => (
        <PortalInject key={`bolt-${i}`} container={container}>
          <Bolt size="16px" />
        </PortalInject>
      ))}

      {/* Spotlight More... Button Icon */}
      {targets.moreBtnContainer && (
        <PortalInject container={targets.moreBtnContainer}>
          <OpenInNew size="20px" />
        </PortalInject>
      )}

      {/* Eye Toggle */}
      {targets.eyeIcon && (
        <PortalReplacer
          target={targets.eyeIcon}
          wrapperStyle={{ cursor: "pointer", display: "inline-flex", fontSize: "24px" }}
        >
          <div onClick={() => (window as any).toggleEye()}>
            <Visibility size="24px" />
          </div>
        </PortalReplacer>
      )}

      {/* Home Links */}
      {targets.homeLinks.map((home, i) => (
        <PortalReplacer
          key={`home-${i}`}
          target={home}
          wrapperStyle={{ display: "inline-flex", cursor: "pointer" }}
        >
          <div onClick={() => (window as any).gotoHome()}>
            <Home size="24px" />
          </div>
        </PortalReplacer>
      ))}
    </>
  );
};
