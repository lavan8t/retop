export const ListCard = ({
  title,
  count,
  bgClass,
  borderClass,
  headerAction,
  onClick,
  children,
}: any) => (
  <div
    onClick={onClick}
    className={`
      bg-(--bg-highlight) border-4 ${borderClass} rounded-4xl 
      shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] 
      flex flex-col h-full overflow-hidden min-h-62.5
      transition-all duration-300 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]
      ${onClick ? "cursor-pointer group" : ""}
    `}
  >
    <div
      className={`${bgClass} px-5 py-3 border-b-4 border-black flex justify-between items-center shrink-0`}
    >
      <h3 className="font-expanded font-black text-lg text-black uppercase tracking-tighter flex items-center gap-2 m-0 leading-none">
        {title}
      </h3>
      <div className="flex items-center gap-2">
        {count !== undefined && (
          <span className="text-[10px] font-black font-mono text-black bg-white/40 px-2 py-0.5 rounded-lg border-2 border-black/10">
            {count}
          </span>
        )}
        {headerAction}
      </div>
    </div>

    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-(--bg-highlight)">
      {children}
    </div>
  </div>
);
