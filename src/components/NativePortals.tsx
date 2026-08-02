import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Helper component to replace a native element with a React/Portal element
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

export const NativePortals: React.FC = () => {
  const [elements, setElements] = useState<{
    stdImg: Element | null;
    empImg: Element | null;
    parentImg: Element | null;
    alumniImg: Element | null;
    bolts: Element[];
    eyeIcon: Element | null;
    homeLinks: Element[];
  }>({
    stdImg: null,
    empImg: null,
    parentImg: null,
    alumniImg: null,
    bolts: [],
    eyeIcon: null,
    homeLinks: [],
  });

  useEffect(() => {
    const findElements = () => {
      setElements({
        stdImg: document.querySelector("#stdForm img:not([data-retop-portal])"),
        empImg: document.querySelector("#empForm img:not([data-retop-portal])"),
        parentImg: document.querySelector("#parentForm img:not([data-retop-portal])"),
        alumniImg: document.querySelector("#alumniForm img:not([data-retop-portal])"),
        bolts: Array.from(document.querySelectorAll(".fa-bolt:not([data-retop-portal])")),
        eyeIcon: document.querySelector("#passwordIcon:not([data-retop-portal])"),
        homeLinks: Array.from(
          document.querySelectorAll(
            '.retop-home-icon:not([data-retop-portal]), a[href="javascript:gotoHome()"]:not([data-retop-portal])'
          )
        ),
      });
    };

    findElements();
    const observer = new MutationObserver(findElements);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    Object.values(elements).flat().forEach((el) => {
      if (el) (el as HTMLElement).dataset.retopPortal = "true";
    });
  }, [elements]);

  return (
    <>
      {/* Role Card Left Icons — Material Symbols Rounded */}
      {elements.stdImg && (
        <PortalReplacer target={elements.stdImg} wrapperClass="retop-inline-icon">
          <span className="material-symbols-rounded" style={{ fontSize: "38px" }}>school</span>
        </PortalReplacer>
      )}
      {elements.empImg && (
        <PortalReplacer target={elements.empImg} wrapperClass="retop-inline-icon">
          <span className="material-symbols-rounded" style={{ fontSize: "38px" }}>badge</span>
        </PortalReplacer>
      )}
      {elements.parentImg && (
        <PortalReplacer target={elements.parentImg} wrapperClass="retop-inline-icon">
          <span className="material-symbols-rounded" style={{ fontSize: "38px" }}>family_restroom</span>
        </PortalReplacer>
      )}
      {elements.alumniImg && (
        <PortalReplacer target={elements.alumniImg} wrapperClass="retop-inline-icon">
          <span className="material-symbols-rounded" style={{ fontSize: "38px" }}>workspace_premium</span>
        </PortalReplacer>
      )}

      {/* Spotlight Bolt Icons — Material Symbols Rounded */}
      {elements.bolts.map((bolt, i) => (
        <PortalReplacer key={`bolt-${i}`} target={bolt} wrapperClass="retop-spotlight-bolt">
          <span className="material-symbols-rounded" style={{ fontSize: "18px" }}>bolt</span>
        </PortalReplacer>
      ))}

      {/* Password Eye Toggle */}
      {elements.eyeIcon && (
        <PortalReplacer
          target={elements.eyeIcon}
          wrapperStyle={{ cursor: "pointer", display: "inline-flex", fontSize: "24px" }}
        >
          <div onClick={() => (window as any).toggleEye()}>
            <span className="material-symbols-rounded">visibility</span>
          </div>
        </PortalReplacer>
      )}

      {/* Home Button Links */}
      {elements.homeLinks.map((home, i) => (
        <PortalReplacer
          key={`home-${i}`}
          target={home}
          wrapperStyle={{ display: "inline-flex", cursor: "pointer" }}
        >
          <div onClick={() => (window as any).gotoHome()}>
            <span className="material-symbols-rounded">home</span>
          </div>
        </PortalReplacer>
      ))}
    </>
  );
};
