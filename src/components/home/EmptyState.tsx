import { Ghost } from "lucide-react";

export const EmptyState = ({
  msg,
  icon: Icon = Ghost,
}: {
  msg: string;
  icon?: any;
}) => (
  <div className="flex flex-col items-center justify-center h-full text-(--text-dim) border-4 border-dashed border-(--border-dim) rounded-2xl p-6 bg-(--bg-main) m-2">
    <Icon className="w-10 h-10 mb-3 opacity-30" />
    <div className="text-xs font-expanded font-bold uppercase tracking-widest text-center opacity-70">
      {msg}
    </div>
  </div>
);
