import React from "react";
import {
  GraduationCap,
  Coins,
  Users,
  ListTodo,
  Ghost,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { CourseSummary, Assignment } from "../types/vtop";
import { UpcomingClass } from "../utils/timetable-slots";
import { motion } from "framer-motion";

const SolidStatCard = ({
  title,
  value,
  subtitle,
  bgClass,
  icon: Icon,
  className = "",
}: any) => (
  <div
    className={`
      ${bgClass} border-4 border-black rounded-[2rem] p-6 
      shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] 
      transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
      hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]
      relative overflow-hidden group h-full flex flex-col justify-between min-h-[160px]
      ${className}
    `}
  >
    <div className="absolute -right-6 -bottom-6 opacity-20 group-hover:opacity-30 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 pointer-events-none">
      <Icon className="w-36 h-36 text-black" />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-black font-bold font-expanded uppercase tracking-widest text-xs border-b-2 border-black/20 pb-1">
          {title}
        </h3>
      </div>
      <div className="text-5xl md:text-6xl font-black font-expanded text-black tracking-tighter leading-none drop-shadow-sm">
        {value}
      </div>
      {subtitle && (
        <p className="text-xs font-bold font-mono text-black/60 uppercase mt-2 tracking-wide flex items-center gap-1">
          {subtitle}
        </p>
      )}
    </div>
  </div>
);

const SolidProgressCard = ({ progress }: { progress: number }) => (
  <div
    className={`
      bg-cyan-400 border-4 border-black rounded-[2rem] p-6 
      shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] 
      transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
      hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]
      relative overflow-hidden group h-full flex flex-col justify-between min-h-[160px]
    `}
  >
    <div className="absolute -right-6 -bottom-6 opacity-20 group-hover:opacity-30 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 pointer-events-none">
      <TrendingUp className="w-36 h-36 text-black" />
    </div>

    <div className="relative z-10 w-full h-full flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <h3 className="text-black font-bold font-expanded uppercase tracking-widest text-xs border-b-2 border-black/20 pb-1">
          Semester Progress
        </h3>
        <span className="font-black text-xl text-black">{progress}%</span>
      </div>

      <div className="w-full">
        <div className="w-full h-4 bg-black/10 border-2 border-black/20 rounded-full overflow-hidden mb-2">
          <motion.div
            className="h-full bg-black rounded-full opacity-80"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "circOut", delay: 0.5 }}
          ></motion.div>
        </div>
        <div className="flex justify-between text-[10px] font-bold font-mono text-black/50 uppercase">
          <span>Start: Jan</span>
          <span>Target: May</span>
        </div>
      </div>
    </div>
  </div>
);

const ListCard = ({ title, count, bgClass, borderClass, children }: any) => (
  <div
    className={`
      bg-zinc-900 border-4 ${borderClass} rounded-[2rem] 
      shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] 
      flex flex-col h-[55vh] min-h-[400px] overflow-hidden
      transition-all duration-300 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]
    `}
  >
    <div
      className={`${bgClass} px-5 py-4 border-b-4 border-black flex justify-between items-center shrink-0`}
    >
      <h3 className="font-expanded font-black text-xl text-black uppercase tracking-tighter flex items-center gap-2">
        {title}
      </h3>
      {count !== undefined && (
        <span className="text-xs font-bold font-mono text-black bg-white/30 px-2 py-1 rounded-lg border-2 border-black/10">
          {count}
        </span>
      )}
    </div>

    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-zinc-900">
      {children}
    </div>
  </div>
);

const AttendanceRow = ({ course }: { course: CourseSummary }) => {
  const val = parseFloat(course.attendance);
  let statusColor = "bg-lime-400 text-black";
  if (isNaN(val)) statusColor = "bg-zinc-400 text-black";
  else if (val < 75) statusColor = "bg-red-500 text-white";
  else if (val < 80) statusColor = "bg-yellow-400 text-black";

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border-2 border-zinc-800 bg-transparent hover:bg-zinc-950/50 hover:border-zinc-700 transition-all group">
      <div className="min-w-0 flex-1 pr-4">
        <div className="text-sm font-bold text-zinc-200 truncate group-hover:text-white">
          {course.name}
        </div>
        <div className="text-[10px] font-mono text-zinc-500 mt-0.5 truncate">
          {course.code}
        </div>
      </div>
      <div
        className={`px-3 py-1 rounded-lg font-black font-expanded text-lg border-2 border-black/10 shadow-sm ${statusColor}`}
      >
        {course.attendance}
      </div>
    </div>
  );
};

const AssignmentRow = ({ assignment }: { assignment: Assignment }) => (
  <div className="p-4 rounded-xl border-2 border-zinc-800 bg-transparent hover:border-blue-500 hover:bg-zinc-950/30 transition-all group cursor-default">
    <div className="flex justify-between items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-zinc-200 leading-tight group-hover:text-blue-400 transition-colors line-clamp-2">
          {assignment.title}
        </div>
        <div className="text-[10px] font-mono text-zinc-500 mt-1 truncate">
          {assignment.course}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end">
        <span className="text-[10px] font-bold font-mono text-blue-400 bg-blue-950/30 border border-blue-900/50 px-2 py-1 rounded">
          {assignment.dueDate}
        </span>
      </div>
    </div>
  </div>
);

const EmptyState = ({
  msg,
  icon: Icon = Ghost,
}: {
  msg: string;
  icon?: any;
}) => (
  <div className="flex flex-col items-center justify-center h-full text-zinc-500 border-4 border-dashed border-zinc-800/50 rounded-2xl m-2 p-6 bg-zinc-950/30">
    <Icon className="w-12 h-12 mb-3 opacity-20" />
    <div className="text-xs font-expanded font-bold uppercase tracking-widest text-center opacity-60">
      {msg}
    </div>
  </div>
);

interface HomeViewProps {
  showProgress: boolean;
  stats: { cgpa: string; credits: string };
  attendance: CourseSummary[];
  avgAttendance: string | number;
  assignments: Assignment[];
  upcoming: UpcomingClass[];
  dayName: string;
}

export const HomeView: React.FC<HomeViewProps> = ({
  showProgress,
  stats,
  attendance,
  avgAttendance,
  assignments,
  upcoming,
  dayName,
}) => {
  const getProgress = () => {
    const start = new Date("2026-01-05").getTime();
    const end = new Date("2026-05-15").getTime();
    const now = new Date().getTime();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const progress = getProgress();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="h-full overflow-y-auto custom-scrollbar px-4 md:px-8 py-8 max-w-[1800px] mx-auto"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <div className="space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div variants={item}>
            {showProgress ? (
              <SolidProgressCard progress={progress} />
            ) : (
              <SolidStatCard
                title="CGPA"
                value={stats.cgpa}
                subtitle="Cumulative"
                bgClass="bg-cyan-400"
                icon={GraduationCap}
              />
            )}
          </motion.div>

          <motion.div variants={item}>
            <SolidStatCard
              title="Credits"
              value={stats.credits}
              subtitle="Earned"
              bgClass="bg-lime-400"
              icon={Coins}
            />
          </motion.div>

          <motion.div variants={item}>
            <SolidStatCard
              title="Attendance"
              value={`${avgAttendance}%`}
              subtitle="Semester Avg"
              bgClass="bg-yellow-400"
              icon={Users}
            />
          </motion.div>

          <motion.div variants={item}>
            <SolidStatCard
              title="Assignments"
              value={`${assignments.length}`}
              subtitle="Pending Tasks"
              bgClass="bg-blue-400"
              icon={ListTodo}
            />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={item}>
            <ListCard
              title="Attendance"
              bgClass="bg-lime-400"
              borderClass="border-lime-500"
            >
              {attendance.length === 0 ? (
                <EmptyState msg="No Registered Courses" />
              ) : (
                attendance.map((c, i) => <AttendanceRow key={i} course={c} />)
              )}
            </ListCard>
          </motion.div>

          <motion.div variants={item}>
            <ListCard
              title={dayName}
              bgClass="bg-cyan-400"
              borderClass="border-cyan-500"
            >
              {upcoming.length === 0 ? (
                <EmptyState msg="No Events Today" icon={CalendarDays} />
              ) : (
                <div className="text-center text-zinc-500 py-10">
                  Events implementation pending...
                </div>
              )}
            </ListCard>
          </motion.div>

          <motion.div variants={item}>
            <ListCard
              title="Assignments"
              count={assignments.length}
              bgClass="bg-blue-400"
              borderClass="border-blue-500"
            >
              {assignments.length === 0 ? (
                <EmptyState msg="All Caught Up!" icon={ListTodo} />
              ) : (
                assignments.map((a, i) => (
                  <AssignmentRow key={i} assignment={a} />
                ))
              )}
            </ListCard>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
