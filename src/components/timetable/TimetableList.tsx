import { TimetableCourse, CourseSummary } from "../../types/vtop";
import {
  Person,
  Schedule,
  PieChart,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { LocationOn } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { motion } from "framer-motion";

export const TimetableList = ({
  courses,
  attendance,
}: {
  courses: TimetableCourse[];
  attendance: CourseSummary[];
  use24HourTime?: boolean;
}) => (
  <div className="h-full w-full bg-(--bg-main) flex flex-col">
    {/* MOBILE VIEW */}
    <div className="md:hidden flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-40 p-3">
      {courses.map((c, i) => {
        const isLab = c.type.includes("Lab");
        const attStr = attendance?.find((a) => a.code === c.code)?.attendance;
        const attVal = parseFloat(attStr || "0");
        const lastCharMatch = c.code.match(/[a-zA-Z]+$/);
        const courseBadge = lastCharMatch
          ? lastCharMatch[0].slice(-1).toUpperCase()
          : isLab
            ? "P"
            : "L";

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-(--bg-surface) border-2 border-(--border-dim) rounded-2xl p-4 shadow-none flex flex-col gap-3 shrink-0"
          >
            <div className="flex justify-between items-start">
              <span
                className={`px-2 py-1 rounded text-[10px] font-black uppercase flex items-center justify-center ${isLab ? "bg-purple-500/20 text-purple-400" : "bg-(--bg-highlight) text-(--text-main)"}`}
              >
                {courseBadge}
              </span>
              <span className="text-[9px] font-bold text-(--text-muted) uppercase bg-(--bg-highlight) px-2 py-1 rounded-lg border border-(--border-dim)">
                {c.code}
              </span>
            </div>

            <h3 className="text-base font-black font-expanded text-(--text-main) leading-tight">
              {c.title}
            </h3>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="flex items-center gap-2 text-[10px] font-bold text-(--text-muted) bg-(--bg-highlight) p-2 rounded-xl border border-(--border-dim)">
                <Schedule className="w-3.5 h-3.5 text-(--text-muted)" />
                <span className="truncate">{c.slot}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-(--text-muted) bg-(--bg-highlight) p-2 rounded-xl border border-(--border-dim)">
                <LocationOn className="w-3.5 h-3.5 text-(--text-muted) shrink-0" />
                <span className="truncate">{c.venue}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-(--text-muted) bg-(--bg-highlight) p-2 rounded-xl border border-(--border-dim)">
                <Person className="w-3.5 h-3.5 text-(--text-muted)" />
                <span className="truncate">{c.faculty}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-(--text-muted) bg-(--bg-highlight) p-2 rounded-xl border border-(--border-dim)">
                <PieChart
                  className={`w-3.5 h-3.5 ${!attStr ? "text-(--text-muted)" : attVal <= 75 ? "text-red-500" : "text-(--att-safe)"}`}
                />
                <span
                  className={`truncate font-black ${!attStr ? "text-(--text-muted)" : attVal <= 75 ? "text-red-400" : "text-(--text-main)"}`}
                >
                  {attStr ? `${attStr}` : "N/A"}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>

    {/* --- DESKTOP VIEW --- */}
    <div className="hidden md:block flex-1 overflow-auto custom-scrollbar pb-32 xl:pb-0">
      <table className="w-full text-left border-collapse table-fixed min-w-200">
        <thead className="sticky top-0 bg-(--bg-surface) z-10 shadow-md">
          <tr className="text-(--text-main) font-expanded font-bold text-sm uppercase  border-b-4 border-(--border-main)">
            <th className="py-4 px-6 w-[15%]">Code</th>
            <th className="py-4 px-4 w-[25%]">Course Title</th>
            <th className="py-4 px-4 w-[10%] text-center">Type</th>
            <th className="py-4 px-4 w-[15%]">Slot</th>
            <th className="py-4 px-4 w-[10%]">Venue</th>
            <th className="py-4 px-4 w-[15%]">Faculty</th>
            <th className="py-4 px-4 w-[5%] text-center">Att</th>
            <th className="py-4 px-4 w-[5%] text-center pr-6">Cr</th>
          </tr>
        </thead>
        <tbody className="text-sm text-(--text-main) divide-y divide-(--border-dim)">
          {courses.map((c, i) => {
            const isLab = c.type.includes("Lab");
            const attStr = attendance?.find(
              (a) => a.code === c.code,
            )?.attendance;
            const attVal = parseFloat(attStr || "0");
            const attColor = !attStr
              ? "text-(--text-muted)"
              : attVal <= 75
                ? "text-red-400 font-black"
                : "text-(--att-safe)";

            const lastCharMatch = c.code.match(/[a-zA-Z]+$/);
            const courseBadge = lastCharMatch
              ? lastCharMatch[0].slice(-1).toUpperCase()
              : isLab
                ? "P"
                : "L";

            return (
              <tr
                key={i}
                className="group hover:bg-(--bg-highlight) transition-colors cursor-pointer"
              >
                <td className="py-3 px-6 font-black text-(--text-main) group-hover:text-blue-400 truncate">
                  {c.code}
                </td>
                <td
                  className="py-3 px-4 font-bold truncate text-(--text-main) transition-colors"
                  title={c.title}
                >
                  {c.title}
                </td>
                <td className="py-3 px-4 text-center flex items-center justify-center">
                  <span
                    className={`px-2 py-1 rounded text-[10px] font-black uppercase flex items-center justify-center min-w-8 ${isLab ? "bg-purple-500/20 text-purple-400" : "bg-(--bg-highlight) text-(--text-main)"}`}
                  >
                    {courseBadge}
                  </span>
                </td>
                <td
                  className="py-3 px-4 font-black text-(--text-main) truncate text-xs"
                  title={c.slot}
                >
                  {c.slot}
                </td>
                <td className="py-3 px-4 flex items-center gap-1.5 text-xs font-bold text-(--text-muted)">
                  <LocationOn className="w-3.5 h-3.5 text-(--text-muted) shrink-0" />
                  <span className="truncate">{c.venue}</span>
                </td>
                <td
                  className="py-3 px-4 text-(--text-muted) text-xs truncate uppercase font-medium transition-colors"
                  title={c.faculty}
                >
                  {c.faculty}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`font-bold text-xs ${attColor}`}>
                    {attStr || "-"}
                  </span>
                </td>
                <td className="py-3 px-4 font-bold text-(--text-main) text-center pr-6">
                  {c.credits}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);
