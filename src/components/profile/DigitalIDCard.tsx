import React from "react";
import { StudentProfile } from "../../types/vtop";
import { loadAsciiArt } from "../asciiArt";
import { ASCII_ART_BUNDLED } from "../asciiArtData";

// ─── helpers ────────────────────────────────────────────────────────────────

const toTitleCase = (str: string) => {
  if (!str) return "";
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
  );
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), 2000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

const SCALE = 4;
const CARD_W = 296;
const CARD_H = 462.5;

// ─── draw front side ────────────────────────────────────────────────────────

async function drawFront(canvas: HTMLCanvasElement, data: StudentProfile, isChennai: boolean) {
  canvas.width = Math.round(CARD_W * SCALE);
  canvas.height = Math.round(CARD_H * SCALE);

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(SCALE, SCALE);

  // White background
  ctx.fillStyle = "#ffffff";
  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, 16);
  ctx.fill();

  ctx.save();
  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, 16);
  ctx.clip();

  const cx = CARD_W / 2;

  // Header: "VTOP" in Times New Roman (black, 1.5x bigger -> 54px)
  ctx.font = "bold 54px 'Times New Roman', Times, serif";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("VTOP", cx, 10);

  // Campus line: scale-x-120
  const campusName = isChennai ? "CHENNAI" : "VELLORE";
  ctx.save();
  ctx.translate(cx, 68);
  ctx.scale(1.2, 1.0);
  ctx.font = "900 17px 'Times New Roman', Times, serif";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`${campusName} CAMPUS`, 0, 0);
  ctx.restore();

  // Photo container (124px x 188px)
  const photoW = 124;
  const photoH = 188;
  const photoX = (CARD_W - photoW) / 2;
  const photoY = 92;

  let photoDrawn = false;
  if (data?.basic?.photoUrl) {
    try {
      const img = await loadImage(data.basic.photoUrl);
      if (img) {
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const targetAspect = photoW / photoH;
        let dw = photoW;
        let dh = photoH;
        if (imgAspect > targetAspect) {
          dh = photoW / imgAspect;
        } else {
          dw = photoH * imgAspect;
        }
        const dx = photoX + (photoW - dw) / 2;
        const dy = photoY + (photoH - dh) / 2;
        ctx.save();
        ctx.filter = "brightness(110%)";
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
        photoDrawn = true;
      }
    } catch {}
  }

  if (!photoDrawn) {
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.arc(cx, photoY + 60, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, photoY + 160, 56, Math.PI, 0);
    ctx.fill();
  }

  // Hosteller / Day Scholar Banner
  const isHosteller = !!data?.hostel;
  const bannerH = 38;
  const bannerY = CARD_H - bannerH;

  ctx.fillStyle = isHosteller ? "#181d79" : "#C41E3A";
  ctx.fillRect(0, bannerY, CARD_W, bannerH);

  ctx.font = "bold 22px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(isHosteller ? "HOSTELLER" : "DAY SCHOLAR", cx, bannerY + bannerH / 2);

  // Name & RegNo (anchored from bottom, stacked upwards above the banner)
  const fullName = toTitleCase(data?.basic?.name ?? "");
  const isShortName = fullName.length < 17;
  const words = fullName.split(" ");
  const line1 = words[0] || "";
  const line2 = words.slice(1).join(" ") || "";

  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  // RegNo just above the banner
  ctx.font = "bold 19px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "#000000";
  ctx.fillText(data?.basic?.regNo ?? "", cx, bannerY - 8);

  // Name above RegNo with increased spacing
  ctx.fillStyle = "#181d79";
  if (isShortName) {
    ctx.font = "bold 26px Arial, Helvetica, sans-serif";
    ctx.fillText(fullName, cx, bannerY - 40);
  } else {
    ctx.font = "bold 24px Arial, Helvetica, sans-serif";
    ctx.fillText(line2, cx, bannerY - 40);
    ctx.fillText(line1, cx, bannerY - 68);
  }

  ctx.restore();
}

// ─── draw back side ─────────────────────────────────────────────────────────

function drawBack(
  canvas: HTMLCanvasElement,
  data: StudentProfile,
  isChennai: boolean,
  asciiText: string,
) {
  canvas.width = Math.round(CARD_W * SCALE);
  canvas.height = Math.round(CARD_H * SCALE);

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(SCALE, SCALE);

  // White background
  ctx.fillStyle = "#ffffff";
  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, 16);
  ctx.fill();

  ctx.save();
  drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, 16);
  ctx.clip();

  const address = data?.permanentAddress || ({} as any);
  const contactNo =
    data?.permanentAddress?.phone || data?.personal?.mobile || "Not Provided";

  const LEFT = 13;
  let y = 14;

  ctx.fillStyle = "#000000";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // App. No:
  ctx.font = "italic bold 13.5px 'Times New Roman', Times, serif";
  ctx.fillText("App. No:", LEFT, y);
  const appW = ctx.measureText("App. No:").width;
  ctx.font = "bold 13.5px Arial, Helvetica, sans-serif";
  ctx.fillText(data?.personal?.appNo ?? "", LEFT + appW + 4, y);
  y += 17.5;

  // Blood Group :
  ctx.font = "italic bold 13.5px 'Times New Roman', Times, serif";
  ctx.fillText("Blood Group :", LEFT, y);
  const bgW = ctx.measureText("Blood Group :").width;
  ctx.font = "bold 13.5px Arial, Helvetica, sans-serif";
  ctx.fillText(data?.personal?.bloodGroup ?? "", LEFT + bgW + 4, y);
  y += 19.5;

  // Official Address :
  ctx.font = "italic bold 13.5px 'Times New Roman', Times, serif";
  ctx.fillText("Official Address :", LEFT, y);
  y += 16.5;

  ctx.font = "bold 12.5px Arial, Helvetica, sans-serif";
  const officialLines = isChennai
    ? [
        "Vellore Institute of Technology,",
        "Vandalur - Kelambakkam Road,",
        "Chennai - 600 127, Tamilnadu, India.",
        "Ph : 044 3993 1555",
      ]
    : [
        "Vellore Institute of Technology,",
        "Vellore - 632 014, Tamilnadu, India.",
        "Ph : 0416 224 3091",
        "Fax : 0416 224 3092",
      ];
  for (const line of officialLines) {
    ctx.fillText(line, LEFT + 7, y);
    y += 15.5;
  }
  y += 3.5;

  // Address :
  ctx.font = "italic bold 13.5px 'Times New Roman', Times, serif";
  ctx.fillText("Address :", LEFT, y);
  y += 16.5;

  ctx.font = "bold 12.5px Arial, Helvetica, sans-serif";
  const addrLines = [
    `${address.street || ""},`,
    `${address.area || ""}, ${address.city || ""},`,
    `${address.pincode || ""}, ${address.state || ""},`,
    address.country || "",
  ];
  for (const line of addrLines) {
    ctx.fillText(line.toUpperCase(), LEFT + 7, y);
    y += 15.5;
  }
  y += 3.5;

  // Contact No. :
  ctx.font = "italic bold 13.5px 'Times New Roman', Times, serif";
  ctx.fillText("Contact No. :", LEFT, y);
  y += 16.5;
  ctx.font = "bold 14px Arial, Helvetica, sans-serif";
  ctx.fillText(contactNo, LEFT + 7, y);
  y += 19.5;

  // Valid Upto :
  ctx.font = "italic bold 13.5px 'Times New Roman', Times, serif";
  ctx.fillText("Valid Upto :", LEFT, y);
  const vuW = ctx.measureText("Valid Upto :").width;
  ctx.font = "bold 14px Arial, Helvetica, sans-serif";
  ctx.fillText("JUL-2028", LEFT + vuW + 4, y);

  // ─── ASCII Art (TT) 1.5x scale, mounted at bottom, extends to sides ────────
  const artToDraw = asciiText || ASCII_ART_BUNDLED["TT"] || "";
  if (artToDraw) {
    const rawLines = artToDraw.split("\n");
    let startIdx = 0;
    while (startIdx < rawLines.length && !rawLines[startIdx].trim()) startIdx++;
    let endIdx = rawLines.length - 1;
    while (endIdx >= 0 && !rawLines[endIdx].trim()) endIdx--;
    const lines = rawLines.slice(startIdx, endIdx + 1);

    if (lines.length > 0) {
      const maxLen = Math.max(...lines.map((l) => l.length));
      const availW = CARD_W;
      const baseCharW = availW / maxLen;
      // 1.5x scale
      const fontSize = Math.max(1, (baseCharW / 0.6) * 1.5);
      const lineH = fontSize * 0.92;
      const totalH = lines.length * lineH;

      const blockW = maxLen * (fontSize * 0.6);
      const startX = (CARD_W - blockW) / 2;
      const marginB = 8;
      const startY = CARD_H - marginB - totalH;

      ctx.fillStyle = "#000000";
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], startX, startY + i * lineH);
      }
    }
  }

  ctx.restore();
}

// ─── component ───────────────────────────────────────────────────────────────

export const DigitalIDCard = ({ data }: { data: StudentProfile }) => {
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const frontRef = React.useRef<HTMLCanvasElement>(null);
  const backRef = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);

  const isChennai =
    (data as any)?.campus === "chennai" ||
    (typeof window !== "undefined" && window.location.hostname.includes("vtopcc")) ||
    (typeof window !== "undefined" && (window as any)._retopCampus === "chennai");

  React.useEffect(() => {
    let isCancelled = false;

    const renderCard = async () => {
      const frontCanvas = frontRef.current;
      const backCanvas = backRef.current;
      if (!frontCanvas || !backCanvas) return;

      if (typeof document !== "undefined" && document.fonts) {
        try {
          await document.fonts.ready;
        } catch {}
      }

      let asciiText = ASCII_ART_BUNDLED["TT"] || "";
      try {
        const loaded = await loadAsciiArt("TT");
        if (loaded) asciiText = loaded;
      } catch {}

      if (isCancelled) return;

      try {
        await drawFront(frontCanvas, data, isChennai);
      } catch (err) {
        console.error("[retop] drawFront error:", err);
      }

      if (isCancelled) return;

      try {
        drawBack(backCanvas, data, isChennai, asciiText);
      } catch (err) {
        console.error("[retop] drawBack error:", err);
      }

      if (!isCancelled) setReady(true);
    };

    renderCard();

    return () => {
      isCancelled = true;
    };
  }, [data, isChennai]);

  const showBack = isFlipped !== isHovered;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Student ID card. Tap or click to flip."
      onClick={() => setIsFlipped((prev) => !prev)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsFlipped((prev) => !prev);
        }
      }}
      className="retop-digital-id-card group w-full max-w-74 aspect-64/100 cursor-pointer shrink-0 select-none touch-manipulation focus:outline-none"
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative w-full h-full shadow-none rounded-2xl"
        style={{
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
          transform: showBack ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.5s",
        }}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 rounded-2xl border-2 border-border-dim bg-white"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <canvas
            ref={frontRef}
            className="w-full h-full rounded-2xl pointer-events-none"
            style={{ display: ready ? "block" : "none" }}
          />
          {!ready && (
            <div className="w-full h-full bg-white animate-pulse rounded-2xl" />
          )}
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 rounded-2xl border-2 border-border-dim bg-white"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <canvas
            ref={backRef}
            className="w-full h-full rounded-2xl pointer-events-none"
            style={{ display: ready ? "block" : "none" }}
          />
          {!ready && (
            <div className="w-full h-full bg-white animate-pulse rounded-2xl" />
          )}
        </div>
      </div>
    </div>
  );
};