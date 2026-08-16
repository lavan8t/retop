import React from "react";
import { VIT_EMBLEM_SVG_RAW } from "./VitEmblemSvg";

interface VitEmblemLoaderProps {
  className?: string;
  size?: number | string;
}

export const VitEmblemLoader: React.FC<VitEmblemLoaderProps> = ({
  className = "",
  size = 240,
}) => {
  return (
    <div
      className={`vit-emblem-loader inline-flex items-center justify-center select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: VIT_EMBLEM_SVG_RAW }}
    />
  );
};
