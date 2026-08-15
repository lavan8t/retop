import React from "react";

export const isValid = (val: string | null | undefined) =>
  val &&
  val !== "-" &&
  val.trim() !== "" &&
  val.toUpperCase() !== "N/A" &&
  val.toUpperCase() !== "NA";

export const BentoBlock = ({
  title,
  value,
  span = "col-span-1",
  children,
  className = "",
  icon: Icon,
}: any) => {
  if (value !== undefined && !isValid(value)) return null;

  return (
    <div
      className={`relative p-5 md:p-6 bg-(--bg-surface) text-(--text-main) rounded-4xl transition-all duration-fast flex flex-col justify-between gap-4 overflow-hidden wrap-break-words whitespace-normal min-h-[140px] max-h-max ${span} ${className}`}
    >
      <div className="relative z-10 flex flex-col justify-between h-full gap-4 w-full">
        {Icon ? (
          <div className="flex items-start justify-between w-full h-full gap-4">
            <Icon className="w-8 h-8 md:w-10 md:h-10 text-(--text-main) mix-blend-overlay opacity-80 shrink-0" />
            <div className="flex flex-col items-end justify-end text-right h-full w-full min-w-0">
              {title && (
                <div className="text-[10px] md:text-xs uppercase font-black font-expanded opacity-50 shrink-0 mb-2">
                  {title}
                </div>
              )}
              {value ? (
                <div className="text-2xl md:text-3xl font-black font-expanded leading-none w-full wrap-break-words whitespace-normal py-1">
                  {value}
                </div>
              ) : (
                <div className="w-full flex flex-col items-end justify-end text-sm md:text-base font-black font-expanded gap-1 wrap-break-words whitespace-normal">
                  {children}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {title && (
              <div className="text-[10px] md:text-xs uppercase font-black font-expanded opacity-50 shrink-0">
                {title}
              </div>
            )}
            {value ? (
              <div className="text-2xl md:text-3xl font-black font-expanded leading-none w-full wrap-break-words whitespace-normal">
                {value}
              </div>
            ) : (
              <div className="w-full flex flex-col justify-end text-sm md:text-base font-black font-expanded gap-1 wrap-break-words whitespace-normal">
                {children}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
