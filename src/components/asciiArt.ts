import React, { useEffect, useRef, useState } from 'react';
import { getExtUrl } from '../utils/url';

export type AsciiArtType = 'TT' | 'SMV' | 'MGR' | 'CC';

export interface AsciiLayoutConfig {
  charW: number;
  charH: number;
  fontSize: string;
  lineH: string;
  marginRight: string;
}

export const getAsciiConfig = (type: AsciiArtType): AsciiLayoutConfig => {
  switch (type) {
    case 'CC':
      return {
        charW: 2.5,
        charH: 4,
        fontSize: '4px',
        lineH: '4px',
        marginRight: '0px',
      };
    case 'SMV':
      return {
        charW: 2.5,
        charH: 4,
        fontSize: '4.2px',
        lineH: '4px',
        marginRight: '0px',
      };
    case 'MGR':
      return {
        charW: 2.9,
        charH: 4.4,
        fontSize: '4.8px',
        lineH: '4.4px',
        marginRight: '0px',
      };
    case 'TT':
    default:
      return {
        charW: 4.2,
        charH: 7,
        fontSize: '7px',
        lineH: '7px',
        marginRight: '0px',
      };
  }
};

export const pickAsciiType = (campus?: 'chennai' | 'vellore'): AsciiArtType => {
  const isChennai =
    campus === 'chennai' ||
    (typeof window !== 'undefined' &&
      window.location.hostname.includes('vtopcc')) ||
    (typeof localStorage !== 'undefined' &&
      localStorage.getItem('retop_last_campus') === 'chennai');

  const artTypes: AsciiArtType[] = isChennai ? ['CC'] : ['TT', 'SMV', 'MGR'];
  const lastArt =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('retop_last_ascii_art') || ''
      : '';
  const availableArts = artTypes.filter((type) => type !== lastArt);
  const picked = availableArts.length
    ? availableArts[Math.floor(Math.random() * availableArts.length)]
    : artTypes[Math.floor(Math.random() * artTypes.length)];

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('retop_last_ascii_art', picked);
  }
  return picked;
};

const asciiCache = new Map<AsciiArtType, string>();

export const loadAsciiArt = async (type: AsciiArtType): Promise<string> => {
  if (asciiCache.has(type)) {
    return asciiCache.get(type)!;
  }
  const filename = `assets/ascii_${type.toLowerCase()}.txt`;
  const candidates: string[] = [];

  try {
    candidates.push(getExtUrl(`dist/${filename}`));
    candidates.push(getExtUrl(filename));
  } catch {}

  candidates.push(`./${filename}`);
  candidates.push(`/${filename}`);
  candidates.push(filename);
  candidates.push(`../${filename}`);

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) continue;
      const text = (await res.text()).replace(/\r/g, '');
      if (
        !text ||
        text.trim().startsWith('<!doctype') ||
        text.trim().startsWith('<html') ||
        text.trim().startsWith('<head') ||
        text.trim().startsWith('<body') ||
        text.trim().startsWith('<script')
      ) {
        continue;
      }
      asciiCache.set(type, text);
      return text;
    } catch {}
  }

  console.warn(`[retop] Failed to load ASCII art for ${type}`);
  return '';
};

export const runAsciiSparkAnimation = (
  pre: HTMLPreElement,
  asciiArt: string,
  onComplete?: () => void,
): (() => void) => {
  if (!pre || !asciiArt) return () => {};

  const lines = asciiArt.split('\n');
  const H = lines.length;
  if (H === 0) {
    pre.textContent = asciiArt;
    return () => {};
  }

  // Pre-calculate blank lines to preserve exact width and spacing
  const blankLines = lines.map((line) => line.replace(/\S/g, ' '));

  // Start with empty canvas
  pre.textContent = blankLines.join('\n');

  // Total duration ~1.5s with 25ms steps (60 frames)
  const totalDuration = 1500;
  const intervalMs = 25;
  const totalSteps = Math.round(totalDuration / intervalMs);
  let step = 0;
  let interval: ReturnType<typeof setInterval> | null = null;

  // Natural ease-out: fires briskly from ground and decelerates smoothly at the roofline
  const easeOut = (t: number): number => {
    return 1 - Math.pow(1 - t, 2.5);
  };

  const cleanup = () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  };

  interval = setInterval(() => {
    step++;
    const t = Math.min(1, step / totalSteps);
    const progress = easeOut(t);

    // Bottom-up: beamLine sweeps from H down to -6 so the trailing glow sweeps cleanly off top
    const beamLine = Math.round((1 - progress) * (H + 7)) - 6;

    if (step >= totalSteps || beamLine < -5) {
      cleanup();
      pre.textContent = asciiArt;
      if (onComplete) onComplete();
      return;
    }

    let html = '';
    for (let y = 0; y < H; y++) {
      if (y > beamLine + 5) {
        // Below trail: already etched baseline characters
        html += lines[y] + '\n';
      } else if (y === beamLine || y === beamLine + 1) {
        // Leading laser front: intense pure white neon spark
        html += `<span class="retop-ascii-spark">${lines[y]}</span>\n`;
      } else if (y === beamLine + 2 || y === beamLine + 3) {
        // Sustained white glow zone (lingering white glow)
        html += `<span class="retop-ascii-glow">${lines[y]}</span>\n`;
      } else if (y === beamLine + 4 || y === beamLine + 5) {
        // Cooling phosphor tail
        html += `<span class="retop-ascii-trail">${lines[y]}</span>\n`;
      } else {
        // Above beam: not yet scanned / dark
        html += blankLines[y] + '\n';
      }
    }
    pre.innerHTML = html.slice(0, -1);
  }, intervalMs);

  return cleanup;
};

export const AsciiPanel: React.FC<{
  campus?: 'chennai' | 'vellore';
  scale?: number;
}> = ({ campus, scale = 1 }) => {
  const preRef = useRef<HTMLPreElement>(null);
  const [pickedType, setPickedType] = useState<AsciiArtType>(() =>
    pickAsciiType(campus),
  );
  const [art, setArt] = useState<string>('');

  useEffect(() => {
    const newType = pickAsciiType(campus);
    setPickedType(newType);
    loadAsciiArt(newType).then(setArt);
  }, [campus]);

  const { fontSize, lineH, marginRight, charW } = getAsciiConfig(pickedType);

  useEffect(() => {
    const pre = preRef.current;
    const parent = pre?.parentElement;
    if (!pre || !parent) return;

    const apply = () => {
      // Shrink to the container when the art is wider, so it never runs off the right edge.
      const maxLen = Math.max(
        1,
        ...art.split('\n').map((line) => line.trimEnd().length),
      );
      const ratio = charW / parseFloat(fontSize) || 0.6;
      const size = Math.min(
        parseFloat(fontSize) * scale,
        parent.clientWidth / (maxLen * ratio),
      );
      pre.style.setProperty('font-size', `${size}px`, 'important');
      pre.style.setProperty(
        'line-height',
        `${(parseFloat(lineH) / parseFloat(fontSize)) * size}px`,
        'important',
      );
      pre.style.setProperty('letter-spacing', '0px', 'important');
      pre.style.setProperty('margin-right', '0px', 'important');
    };

    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [art, fontSize, lineH, marginRight, charW, scale]);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre || !art) return;

    // Never replay the reveal on a re-mount: keep the finished art on screen.
    const key = `retop_ascii_animated_${pickedType}`;
    let already = false;
    try {
      already = sessionStorage.getItem(key) === '1';
    } catch {}

    if (already) {
      pre.textContent = art;
      return;
    }

    return runAsciiSparkAnimation(pre, art, () => {
      try {
        sessionStorage.setItem(key, '1');
      } catch {}
    });
  }, [art, pickedType]);

  return React.createElement('pre', {
    ref: preRef,
    id: 'retop-ascii-art',
    style: {
      fontFamily: 'monospace',
      fontSize,
      lineHeight: lineH,
      letterSpacing: '0px',
      textAlign: 'right',
      margin: 0,
      marginRight,
      padding: 0,
      whiteSpace: 'pre',
      overflow: 'hidden',
      width: '100%',
      userSelect: 'none',
      pointerEvents: 'none',
    },
  });
};
