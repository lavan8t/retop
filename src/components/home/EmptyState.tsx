import { SentimentVeryDissatisfied } from '@nine-thirty-five/material-symbols-react/outlined';

export const EmptyState = ({
  msg,
  icon: Icon = SentimentVeryDissatisfied,
}: {
  msg: string;
  icon?: any;
}) => (
  <div className="flex flex-col items-center justify-center h-full text-(--text-dim) rounded-2xl p-6 bg-(--bg-main)">
    <Icon className="w-10 h-10 mb-3 opacity-30" />
    <div className="text-xs font-expanded font-bold uppercase  text-center opacity-70">
      {msg}
    </div>
  </div>
);
