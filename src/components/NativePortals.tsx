import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  School,
  Badge,
  FamilyRestroom,
  WorkspacePremium,
  ArrowForward,
  Bolt,
  Visibility,
  Home,
  Warning,
  Autorenew,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

// A helper component to replace a native element with a React element via Portal
const PortalReplacer: React.FC<{
  target: Element;
  children: React.ReactNode;
  wrapperClass?: string;
  wrapperStyle?: React.CSSProperties;
}> = ({ target, children, wrapperClass, wrapperStyle }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Hide the original element
    const originalDisplay = (target as HTMLElement).style.display;
    (target as HTMLElement).style.display = "none";

    // Create a container next to it
    const div = document.createElement("div");
    if (wrapperClass) div.className = wrapperClass;
    Object.assign(div.style, wrapperStyle || {});
    
    // Insert after the target
    target.parentNode?.insertBefore(div, target.nextSibling);
    setContainer(div);

    return () => {
      // Cleanup
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
    stdBtn: Element | null;
    empBtn: Element | null;
    parentBtn: Element | null;
    alumniBtn: Element | null;
    bolts: Element[];
    eyeIcon: Element | null;
    homeLinks: Element[];
  }>({
    stdImg: null,
    empImg: null,
    parentImg: null,
    alumniImg: null,
    stdBtn: null,
    empBtn: null,
    parentBtn: null,
    alumniBtn: null,
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
        stdBtn: document.querySelector("#stdForm button:not([data-retop-portal])"),
        empBtn: document.querySelector("#empForm button:not([data-retop-portal])"),
        parentBtn: document.querySelector("#parentForm button:not([data-retop-portal])"),
        alumniBtn: document.querySelector("#alumniForm button:not([data-retop-portal])"),
        bolts: Array.from(document.querySelectorAll(".spotlight-background .fa-bolt:not([data-retop-portal])")),
        eyeIcon: document.querySelector("#passwordIcon:not([data-retop-portal])"),
        homeLinks: Array.from(document.querySelectorAll('.retop-home-icon:not([data-retop-portal]), a[href="javascript:gotoHome()"]:not([data-retop-portal])')),
      });
    };

    findElements();
    const observer = new MutationObserver(findElements);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Mark elements so we don't re-process them infinitely
  useEffect(() => {
    Object.values(elements).flat().forEach(el => {
      if (el) (el as HTMLElement).dataset.retopPortal = "true";
    });
  }, [elements]);

  return (
    <>
      {elements.stdImg && <PortalReplacer target={elements.stdImg} wrapperClass="retop-inline-icon"><School width="36px" height="36px" /></PortalReplacer>}
      {elements.empImg && <PortalReplacer target={elements.empImg} wrapperClass="retop-inline-icon"><Badge width="36px" height="36px" /></PortalReplacer>}
      {elements.parentImg && <PortalReplacer target={elements.parentImg} wrapperClass="retop-inline-icon"><FamilyRestroom width="36px" height="36px" /></PortalReplacer>}
      {elements.alumniImg && <PortalReplacer target={elements.alumniImg} wrapperClass="retop-inline-icon"><WorkspacePremium width="36px" height="36px" /></PortalReplacer>}

      {elements.stdBtn && <PortalReplacer target={elements.stdBtn}><ArrowForward width="20px" height="20px" /></PortalReplacer>}
      {elements.empBtn && <PortalReplacer target={elements.empBtn}><ArrowForward width="20px" height="20px" /></PortalReplacer>}
      {elements.parentBtn && <PortalReplacer target={elements.parentBtn}><ArrowForward width="20px" height="20px" /></PortalReplacer>}
      {elements.alumniBtn && <PortalReplacer target={elements.alumniBtn}><ArrowForward width="20px" height="20px" /></PortalReplacer>}

      {elements.bolts.map((bolt, i) => <PortalReplacer key={`bolt-${i}`} target={bolt} wrapperClass="retop-spotlight-bolt"><Bolt width="16px" height="16px" /></PortalReplacer>)}
      {elements.eyeIcon && <PortalReplacer target={elements.eyeIcon} wrapperStyle={{ cursor: "pointer", display: "inline-flex", fontSize: "24px" }}><div onClick={() => (window as any).toggleEye()}><Visibility width="1em" height="1em" /></div></PortalReplacer>}
      {elements.homeLinks.map((home, i) => <PortalReplacer key={`home-${i}`} target={home} wrapperStyle={{ display: "inline-flex", cursor: "pointer" }}><div onClick={() => (window as any).gotoHome()}><Home width="24px" height="24px" /></div></PortalReplacer>)}
    </>
  );
};
