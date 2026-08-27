import React, { useEffect, useRef, useState } from "react";
import { getExtUrl } from "../utils/url";
import { ASCII_ART_BUNDLED } from "./asciiArtData";

export type AsciiArtType = "TT" | "SMV" | "MGR" | "CC";

export interface AsciiLayoutConfig {
  charW: number;
  charH: number;
  fontSize: string;
  lineH: string;
  marginRight: string;
}

export const getAsciiConfig = (type: AsciiArtType): AsciiLayoutConfig => {
  switch (type) {
    case "CC":
      return { charW: 2.5, charH: 4, fontSize: "4px", lineH: "4px", marginRight: "0px" };
    case "SMV":
      return { charW: 2.5, charH: 4, fontSize: "4.2px", lineH: "4px", marginRight: "0px" };
    case "MGR":
      return { charW: 2.9, charH: 4.4, fontSize: "4.8px", lineH: "4.4px", marginRight: "0px" };
    case "TT":
    default:
      return { charW: 4.2, charH: 7, fontSize: "7px", lineH: "7px", marginRight: "-15vw" };
  }
};

export const pickAsciiType = (campus?: "chennai" | "vellore"): AsciiArtType => {
  const isChennai =
    campus === "chennai" ||
    (typeof window !== "undefined" && window.location.hostname.includes("vtopcc")) ||
    (typeof localStorage !== "undefined" && localStorage.getItem("retop_last_campus") === "chennai");

  const artTypes: AsciiArtType[] = isChennai ? ["CC"] : ["TT", "SMV", "MGR"];
  const lastArt = typeof localStorage !== "undefined" ? localStorage.getItem("retop_last_ascii_art") || "" : "";
  const availableArts = artTypes.filter((type) => type !== lastArt);
  const picked = availableArts.length
    ? availableArts[Math.floor(Math.random() * availableArts.length)]
    : artTypes[Math.floor(Math.random() * artTypes.length)];

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("retop_last_ascii_art", picked);
  }
  return picked;
};

const asciiCache = new Map<AsciiArtType, string>();

export const loadAsciiArt = async (type: AsciiArtType): Promise<string> => {
  if (asciiCache.has(type)) {
    return asciiCache.get(type)!;
  }
  if (ASCII_ART_BUNDLED[type]) {
    const text = ASCII_ART_BUNDLED[type];
    asciiCache.set(type, text);
    return text;
  }
  const filename = `assets/ascii_${type.toLowerCase()}.txt`;
  const candidates: string[] = [];

  if (typeof chrome !== "undefined" && typeof chrome.runtime?.getURL === "function") {
    try {
      candidates.push(getExtUrl(filename));
      candidates.push(chrome.runtime.getURL(filename));
      candidates.push(chrome.runtime.getURL(`dist/${filename}`));
    } catch {}
  }

  candidates.push(`./${filename}`);
  candidates.push(`/${filename}`);
  candidates.push(filename);
  candidates.push(`../${filename}`);

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html")) continue;
      const text = (await res.text()).replace(/\r/g, "");
      if (
        !text ||
        text.trim().startsWith("<!doctype") ||
        text.trim().startsWith("<html") ||
        text.trim().startsWith("<head") ||
        text.trim().startsWith("<body") ||
        text.trim().startsWith("<script")
      ) {
        continue;
      }
      asciiCache.set(type, text);
      return text;
    } catch {}
  }

  console.warn(`[retop] Failed to load ASCII art for ${type}`);
  return "";
};

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";

export const AsciiPanel: React.FC<{ campus?: "chennai" | "vellore" }> = ({ campus }) => {
  const preRef = useRef<HTMLPreElement>(null);
  const [pickedType, setPickedType] = useState<AsciiArtType>(() => pickAsciiType(campus));
  const [art, setArt] = useState<string>("");

  useEffect(() => {
    const newType = pickAsciiType(campus);
    setPickedType(newType);
    loadAsciiArt(newType).then(setArt);
  }, [campus]);

  const originalLines = useRef<string[]>([]);
  useEffect(() => {
    originalLines.current = art.split("\n");
  }, [art]);

  const ripples = useRef<{ x: number; y: number; t: number }[]>([]);
  const lastMouse = useRef({ x: -9999, y: -9999, t: 0 });

  const { charW, charH, fontSize, lineH, marginRight } = getAsciiConfig(pickedType);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;
    pre.style.setProperty("font-size", fontSize, "important");
    pre.style.setProperty("line-height", lineH, "important");
    pre.style.setProperty("letter-spacing", "0px", "important");
    pre.style.setProperty("margin-right", marginRight, "important");
  }, [fontSize, lineH, marginRight]);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre || !art) return;

    const onMove = (e: MouseEvent) => {
      const rect = pre.getBoundingClientRect();
      const now = Date.now();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = x - lastMouse.current.x;
      const dy = y - lastMouse.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 6 || ripples.current.length === 0) {
        ripples.current.push({ x, y, t: now });
        if (ripples.current.length > 20) ripples.current.shift();
      }
      lastMouse.current = { x, y, t: now };
    };

    let animFrame: number;
    const animate = () => {
      const now = Date.now();
      ripples.current = ripples.current.filter((r) => now - r.t < 900);
      if (ripples.current.length === 0) {
        animFrame = requestAnimationFrame(animate);
        return;
      }

      const lines = originalLines.current;
      let out = "";
      for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        const offsetX = Math.max(0, pre.clientWidth - line.length * charW);
        let newLine = "";
        for (let col = 0; col < line.length; col++) {
          const char = line[col];
          if (char === " ") { newLine += " "; continue; }
          const px = offsetX + col * charW;
          const py = row * charH;
          let wave = 0;
          for (const r of ripples.current) {
            const dx = px - r.x;
            const dy = py - r.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const age = now - r.t;
            const waveR = age * 0.15;
            const dw = Math.abs(dist - waveR);
            if (dw < 30) {
              wave += Math.cos(dw * 0.1) * Math.pow(Math.max(0, 1 - dw / 30), 2) * Math.pow(Math.max(0, 1 - age / 900), 2);
            }
          }
          newLine += Math.abs(wave) > 0.2 ? CHARS[Math.floor(Math.random() * CHARS.length)] : char;
        }
        out += newLine + "\n";
      }
      if (pre) pre.textContent = out.slice(0, -1);
      animFrame = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", onMove);
    animFrame = requestAnimationFrame(animate);
    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(animFrame);
    };
  }, [charW, charH, art]);

  return React.createElement(
    "pre",
    {
      ref: preRef,
      id: "retop-ascii-art",
      style: {
        fontFamily: "monospace",
        fontSize,
        lineHeight: lineH,
        letterSpacing: "0px",
        textAlign: "right",
        margin: 0,
        marginRight,
        padding: 0,
        whiteSpace: "pre",
        overflow: "hidden",
        width: "100%",
        userSelect: "none",
        pointerEvents: "auto",
        animation: "retop-ascii-rise 0.5s linear forwards",
      },
    },
    art
  );
};
