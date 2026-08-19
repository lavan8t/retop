import React from "react";

// Code 128 Character Set B width patterns (0 to 106)
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

export interface BarcodeProps {
  value?: string;
  displayValue?: boolean;
  height?: number;
  width?: number;
  fontSize?: number;
  margin?: number;
  className?: string;
  format?: string;
  background?: string;
  lineColor?: string;
  font?: string;
}

export const Barcode: React.FC<BarcodeProps> = ({
  value = "",
  displayValue = true,
  height = 75,
  width = 2,
  fontSize = 14,
  margin = 0,
  className = "",
  background = "transparent",
  lineColor = "currentColor",
  font = "system-ui, -apple-system, sans-serif",
}) => {
  if (!value) return null;

  const codes: number[] = [];
  let checksum = 104; // Start Code B

  codes.push(104);
  for (let i = 0; i < value.length; i++) {
    const charCode = value.charCodeAt(i) - 32;
    const validCode = charCode >= 0 && charCode <= 95 ? charCode : 0;
    codes.push(validCode);
    checksum += (i + 1) * validCode;
  }
  codes.push(checksum % 103);
  codes.push(106); // Stop Code

  // Build bar rectangles
  const rects: React.ReactNode[] = [];
  let currentX = margin;

  codes.forEach((codeIdx, cIdx) => {
    const pattern = CODE128_PATTERNS[codeIdx] || CODE128_PATTERNS[0];
    for (let pIdx = 0; pIdx < pattern.length; pIdx++) {
      const barWidth = parseInt(pattern[pIdx], 10) * width;
      const isBar = pIdx % 2 === 0;
      if (isBar) {
        rects.push(
          <rect
            key={`${cIdx}-${pIdx}`}
            x={currentX}
            y={margin}
            width={barWidth}
            height={height}
            fill={lineColor}
          />
        );
      }
      currentX += barWidth;
    }
  });

  const totalWidth = currentX + margin;
  const totalHeight = height + (displayValue ? fontSize + 8 : 0) + margin * 2;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className={`text-black max-w-full h-auto select-none ${className}`}
      style={{ overflow: "visible", backgroundColor: background }}
    >
      <g>{rects}</g>
      {displayValue && (
        <text
          x={totalWidth / 2}
          y={height + margin + fontSize + 2}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily={font}
          fontWeight="bold"
          fill={lineColor}
        >
          {value}
        </text>
      )}
    </svg>
  );
};

export default Barcode;
