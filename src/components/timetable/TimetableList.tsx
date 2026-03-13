import { TimetableCourse } from "../../types/vtop";
import { MapPin } from "lucide-react";

export const TimetableList = ({ courses }: { courses: TimetableCourse[] }) => (
  <div className="h-full overflow-hidden bg-zinc-900 border-4 border-zinc-800 rounded-4xl shadow-xl flex flex-col">
    <div className="flex-1 overflow-auto custom-scrollbar">
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
