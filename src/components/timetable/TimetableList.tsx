import { TimetableCourse, CourseSummary } from "../../types/vtop";
import {
  Person,
  Schedule,
  PieChart,
  LocationOn,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
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
    <div className="md:hidden flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-40 p-4">
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-(--bg-surface) rounded-3xl p-5 flex flex-col gap-4 shrink-0 shadow-xs"
          >
            {/* Top Badge Row */}
            <div className="flex justify-between items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase font-mono ${
                  isLab
                    ? "bg-purple-500/15 text-purple-500"
                    : "bg-(--accent-base)/15 text-(--accent-base)"
                }`}
              >
                {courseBadge} · {c.type}
              </span>
              <span className="text-xs font-mono font-bold text-(--text-muted) bg-(--bg-main) px-3 py-1 rounded-full">
                {c.code}
              </span>
            </div>

            {/* Course Title */}
            <h3 className="text-base font-black font-expanded text-(--text-main) leading-snug">
              {c.title}
            </h3>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="flex items-center gap-2 text-xs font-bold text-(--text-muted) bg-(--bg-main) px-3 py-2 rounded-full">
                <Schedule className="w-4 h-4 text-(--accent-base) shrink-0" />
                <span className="truncate">{c.slot}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-(--text-muted) bg-(--bg-main) px-3 py-2 rounded-full">
                <LocationOn className="w-4 h-4 text-(--accent-base) shrink-0" />
                <span className="truncate">{c.venue}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-(--text-muted) bg-(--bg-main) px-3 py-2 rounded-full col-span-2 sm:col-span-1">
                <Person className="w-4 h-4 text-(--accent-base) shrink-0" />
                <span className="truncate">{c.faculty}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-(--text-muted) bg-(--bg-main) px-3 py-2 rounded-full col-span-2 sm:col-span-1">
                <PieChart
                  className={`w-4 h-4 shrink-0 ${
                    !attStr
                      ? "text-(--text-muted)"
                      : attVal <= 75
                        ? "text-red-500"
                        : "text-emerald-500"
                  }`}
                />
                <span
                  className={`truncate font-black ${
                    !attStr
                      ? "text-(--text-muted)"
                      : attVal <= 75
                        ? "text-red-500"
                        : "text-(--text-main)"
                  }`}
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
    <div className="hidden md:block flex-1 overflow-auto custom-scrollbar p-6 pb-32 xl:pb-6">
      <div className="bg-(--bg-surface) rounded-3xl overflow-hidden shadow-xs border-0">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-(--bg-highlight)/60 text-(--text-muted) font-expanded font-black text-xs uppercase tracking-wider border-b border-(--border-dim)">
              <th className="py-4 px-6 w-[15%]">Code</th>
              <th className="py-4 px-4 w-[25%]">Course Title</th>
              <th className="py-4 px-4 w-[12%] text-center">Type</th>
              <th className="py-4 px-4 w-[15%]">Slot</th>
              <th className="py-4 px-4 w-[12%]">Venue</th>
              <th className="py-4 px-4 w-[16%]">Faculty</th>
              <th className="py-4 px-4 w-[5%] text-center pr-6">Att</th>
            </tr>
          </thead>
          <tbody className="text-sm font-medium text-(--text-main) divide-y divide-(--border-dim)/40">
            {courses.map((c, i) => {
              const isLab = c.type.includes("Lab");
              const attStr = attendance?.find(
                (a) => a.code === c.code,
              )?.attendance;
              const attVal = parseFloat(attStr || "0");
              const attColor = !attStr
                ? "text-(--text-muted)"
                : attVal <= 75
                  ? "text-red-500 font-black"
                  : "text-emerald-500 font-black";

              return (
                <tr
                  key={i}
                  className="hover:bg-(--bg-highlight)/50 transition-colors"
                >
                  <td className="py-4 px-6 font-mono font-bold text-xs text-(--text-main)">
                    {c.code}
                  </td>
                  <td className="py-4 px-4 font-bold text-sm text-(--text-main) leading-snug">
                    {c.title}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-mono font-black uppercase ${
                        isLab
                          ? "bg-purple-500/15 text-purple-500"
                          : "bg-(--accent-base)/15 text-(--accent-base)"
                      }`}
                    >
                      {c.type}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-mono text-xs font-bold text-(--text-muted)">
                    {c.slot}
                  </td>
                  <td className="py-4 px-4 font-bold text-xs text-(--text-main)">
                    {c.venue}
                  </td>
                  <td className="py-4 px-4 text-xs font-medium text-(--text-muted) truncate">
                    {c.faculty}
                  </td>
                  <td className={`py-4 px-4 text-center text-xs pr-6 ${attColor}`}>
                    {attStr || "N/A"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
