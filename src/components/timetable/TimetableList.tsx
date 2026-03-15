import { TimetableCourse, CourseSummary } from "../../types/vtop";
import { User, Clock, PieChart } from "lucide-react";
import { Icon } from "@iconify-icon/react";
import { motion } from "framer-motion";

export const TimetableList = ({
  courses,
  attendance,
}: {
  courses: TimetableCourse[];
  attendance: CourseSummary[];
}) => (
  <div className="h-full w-full bg-(--bg-main) flex flex-col">
    {/* MOBILE VIEW */}
    <div className="md:hidden flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-40 p-3">
      {courses.map((c, i) => {
        const isLab = c.type.includes("Lab");
        const attStr = attendance?.find((a) => a.code === c.code)?.attendance;
        const attVal = parseFloat(attStr || "0");

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-zinc-900 border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_#000] flex flex-col gap-3 shrink-0"
          >
            <div className="flex justify-between items-start">
              <span
                className={`px-2 py-1 rounded-lg border-2 border-black text-[10px] font-black uppercase ${isLab ? "bg-purple-400 text-black" : "bg-cyan-400 text-black"}`}
              >
                {c.code}
              </span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                {c.type}
              </span>
            </div>

            <h3 className="text-base font-black font-expanded text-zinc-200 leading-tight">
              {c.title}
            </h3>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <Clock className="w-3 h-3 text-blue-400" />
                <span className="truncate">{c.slot}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <Icon
                  icon="heroicons:map-pin-20-solid"
                  width="15"
                  height="15"
                  className="shrink-0 text-red-400"
                />
                <span className="truncate">{c.venue}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <User className="w-3 h-3 text-emerald-400" />
                <span className="truncate">{c.faculty}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <PieChart
                  className={`w-3 h-3 ${!attStr ? "text-zinc-600" : attVal <= 75 ? "text-red-500" : "text-yellow-400"}`}
                />
                <span
                  className={`truncate ${!attStr ? "text-zinc-600" : attVal <= 75 ? "text-red-400" : "text-zinc-300"}`}
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
          <tr className="text-blue-400 font-expanded font-bold text-sm uppercase tracking-wider border-b-4 border-black">
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
        <tbody className="text-sm text-zinc-300 divide-y divide-zinc-800/50">
          {courses.map((c, i) => {
            const attStr = attendance?.find(
              (a) => a.code === c.code,
            )?.attendance;
            const attVal = parseFloat(attStr || "0");
            const attColor = !attStr
              ? "text-zinc-600"
              : attVal <= 75
                ? "text-red-400 font-black"
                : attVal >= 90
                  ? "text-emerald-400"
                  : "text-blue-400";

            return (
              <tr key={i} className="group hover:bg-zinc-800 transition-colors">
                <td className="py-3 px-6 font-black text-zinc-200 group-hover:text-blue-400 truncate">
                  {c.code}
                </td>
                <td
                  className="py-3 px-4 font-bold truncate text-zinc-200 group-hover:text-zinc-100 transition-colors"
                  title={c.title}
                >
                  {c.title}
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase border-2 border-black ${c.type.includes("Lab") ? "bg-purple-400 text-black" : "bg-cyan-400 text-black"}`}
                  >
                    {c.type.split(" ")[0]}
                  </span>
                </td>
                <td
                  className="py-3 px-4 font-black text-zinc-200 truncate text-xs"
                  title={c.slot}
                >
                  {c.slot}
                </td>
                <td className="py-3 px-4 flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                  <Icon
                    icon="heroicons:map-pin-20-solid"
                    width="15"
                    height="15"
                    className="shrink-0 text-zinc-600"
                  />
                  <span className="truncate">{c.venue}</span>
                </td>
                <td
                  className="py-3 px-4 text-zinc-400 text-xs truncate uppercase font-medium group-hover:text-zinc-200 transition-colors"
                  title={c.faculty}
                >
                  {c.faculty}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`font-bold text-xs ${attColor}`}>
                    {attStr || "-"}
                  </span>
                </td>
                <td className="py-3 px-4 font-bold text-zinc-200 text-center pr-6">
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
