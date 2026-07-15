import { Card } from "../ui/Card";

export const SolidStatCard = ({
  title,
  value,
  subtitle,
  bgClass,
  icon: Icon,
}: any) => (
  <Card
    clickable
    className={`
      ${bgClass} rounded-3xl p-5 relative overflow-hidden group h-full flex flex-col justify-center min-h-35 lg:min-h-0 select-none
    `}
  >
    <div className="absolute -right-4 -bottom-4 opacity-[0.15] group-hover:opacity-30 transition-all duration-normal group-hover:rotate-12 group-hover:scale-110 pointer-events-none">
      <Icon className="w-28 h-28 text-(--text-main)" />
    </div>
    <div className="relative z-10 flex flex-col justify-center h-full">
      <h3 className="text-(--text-main) font-bold font-expanded uppercase  text-xs border-b-2 border-(--border-dim) pb-1 w-fit mb-1">
        {title}
      </h3>
      <div className="text-4xl md:text-5xl font-black font-expanded text-(--text-main)  leading-none drop-shadow-sm mt-1">
        {value}
      </div>
      {subtitle && (
        <p className="text-[10px] font-bold font-mono text-(--text-muted) uppercase mt-2 ">
          {subtitle}
        </p>
      )}
    </div>
  </Card>
);
