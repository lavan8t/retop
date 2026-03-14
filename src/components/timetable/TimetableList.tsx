import { TimetableCourse } from "../../types/vtop";
import { MapPin, User, Clock } from "lucide-react";
import { motion } from "framer-motion";

export const TimetableList = ({ courses }: { courses: TimetableCourse[] }) => (
  // FIX: Changed h-full overflow-hidden to allow for dynamic heights on mobile
  <div className="h-full w-full bg-zinc-950 md:bg-zinc-900 md:border-4 border-black rounded-2xl md:rounded-4xl flex flex-col">
    {/* MOBILE VIEW */}
    <div className="md:hidden flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-40 p-2">
      {courses.map((c, i) => {
        const isLab = c.type.includes("Lab");
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            // FIX: Removed height restrictions, added shadow-[4px_4px_0px_0px_#000] for consistency
            className="bg-zinc-900 border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_#000] flex flex-col gap-3 shrink-0"
          >
            <div className="flex justify-between items-start">
              <span
                className={`px-2 py-1 rounded-lg border-2 border-black text-[10px] font-black uppercase ${isLab ? "bg-purple-400" : "bg-cyan-400"}`}
              >
                {c.code}
              </span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                {c.type}
              </span>
            </div>

            <h3 className="text-base font-black font-expanded text-white leading-tight">
              {c.title}
            </h3>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <Clock className="w-3 h-3 text-blue-400" />
                <span className="truncate">{c.slot}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <MapPin className="w-3 h-3 text-red-400" />
                <span className="truncate">{c.venue}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 bg-zinc-950 p-2 rounded-xl border border-zinc-800 col-span-2">
                <User className="w-3 h-3 text-emerald-400" />
                <span className="truncate">{c.faculty}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>

    {/* --- DESKTOP VIEW --- */}
    {/* FIX: Added pb-32 xl:pb-0 */}
    <div className="hidden md:block flex-1 overflow-auto custom-scrollbar pb-32 xl:pb-0">
      <table className="w-full text-left border-collapse table-fixed min-w-200">
        <thead className="sticky top-0 bg-zinc-950 z-10 shadow-md">
          <tr className="text-blue-400 font-expanded font-bold text-sm uppercase tracking-wider border-b-2 border-zinc-800">
            <th className="py-4 px-6 w-[15%]">Code</th>
            <th className="py-4 px-4 w-[30%]">Course Title</th>
            <th className="py-4 px-4 w-[10%] text-center">Type</th>
            <th className="py-4 px-4 w-[15%]">Slot</th>
            <th className="py-4 px-4 w-[10%]">Venue</th>
            <th className="py-4 px-4 w-[15%]">Faculty</th>
            <th className="py-4 px-4 w-[5%] text-center pr-6">Cr</th>
          </tr>
        </thead>
        <tbody className="text-sm text-zinc-300 divide-y divide-zinc-800/50">
          {courses.map((c, i) => (
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
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${c.type.includes("Lab") ? "bg-purple-950/30 text-purple-400 border-purple-900/50" : "bg-blue-950/30 text-blue-400 border-blue-900/50"}`}
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
                <MapPin className="w-3.5 h-3.5 text-zinc-600" /> {c.venue}
              </td>
              <td
                className="py-3 px-4 text-zinc-400 text-xs truncate uppercase font-medium group-hover:text-zinc-200 transition-colors"
                title={c.faculty}
              >
                {c.faculty}
              </td>
              <td className="py-3 px-4 font-bold text-zinc-200 text-center pr-6">
                {c.credits}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
