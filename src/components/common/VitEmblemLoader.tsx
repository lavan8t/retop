import React from "react";
import { VIT_EMBLEM_SVG_RAW } from "./VitEmblemSvg";
import { VIT_EMBLEM_ANIMATION_CSS } from "./vitEmblemStyles";

interface VitEmblemLoaderProps {
  className?: string;
  size?: number | string;
  finishing?: boolean;
}

export const VitEmblemLoader: React.FC<VitEmblemLoaderProps> = ({
  className = "",
  size = 210,
  finishing = false,
}) => {
  return (
    <>
      <style>{VIT_EMBLEM_ANIMATION_CSS}</style>
      <div
        className={`vit-emblem-loader ${finishing ? "vit-emblem-fast-finish" : ""} inline-flex items-center justify-center select-none pointer-events-none ${className}`}
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: VIT_EMBLEM_SVG_RAW }}
      />
    </>
  );
};
