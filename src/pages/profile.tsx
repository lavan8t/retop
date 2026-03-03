import React, { useState, useEffect } from "react";
import { VTOPNetwork } from "../utils/network";
import { parseStudentProfile } from "../parsers/profile";
import { StudentProfile } from "../types/vtop";
import {
  User,
  Smartphone,
  Mail,
  MapPin,
  Loader2,
  GraduationCap,
  Briefcase,
  Home,
  Phone,
  Building,
  Shield,
} from "lucide-react";
import { motion } from "framer-motion";

interface ProfilePageProps {
  network: VTOPNetwork;
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col border-b border-zinc-800 py-1.5 last:border-0 hover:bg-zinc-800/50 px-3 -mx-3 rounded transition-colors overflow-hidden">
    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5 truncate">
      {label}
    </span>

    <span className="text-sm font-bold font-mono text-zinc-200 whitespace-normal wrap-break-word leading-tight">
      {value && value !== "-" ? (
        value
      ) : (
        <span className="text-zinc-600">-</span>
      )}
    </span>
  </div>
);

const AddressCard = ({ title, data }: { title: string; data: any }) => (
  <div className="bg-zinc-800/50 p-3 rounded-xl border-2 border-zinc-800 h-full flex flex-col justify-center min-w-0">
    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2 border-b-2 border-zinc-800 pb-1.5 shrink-0">
      <MapPin className="w-3 h-3" /> {title}
    </h4>
    <div className="space-y-1 overflow-hidden">
      <div className="text-sm font-black text-zinc-200 leading-tight wrap-break-word">
        {data.street}
      </div>
      <div className="text-[10px] font-mono text-zinc-500 truncate">
        {data.area}
      </div>
      <div className="text-[10px] font-mono text-zinc-500 truncate">
        {data.city}, {data.state}
      </div>
      <div className="text-[10px] font-mono text-zinc-500 truncate">
        {data.country} -{" "}
        <span className="text-zinc-200 font-bold">{data.pincode}</span>
      </div>
      {data.phone && (
        <div className="text-[10px] font-bold flex items-center gap-2 mt-2 text-blue-500 pt-2 border-t border-zinc-800 shrink-0">
          <Phone className="w-3 h-3" /> {data.phone}
        </div>
      )}
    </div>
  </div>
);

const BentoCard = ({
  title,
  icon: Icon,
  children,
  delay,
  colSpan = "md:col-span-1",
  className = "",
}: any) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay }}
    className={`bg-zinc-900 border-4 border-zinc-800 rounded-4xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.25)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 transition-all flex flex-col min-w-0 ${colSpan} ${className}`}
  >
    {title && (
      <div className="flex items-center gap-3 mb-1.5 pb-1 border-b-4 border-zinc-800 shrink-0">
        <div className="p-1.5 bg-zinc-800 text-zinc-200 rounded-lg shadow-sm">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <h3 className="font-expanded font-black text-base uppercase tracking-tight text-zinc-200 truncate">
          {title}
        </h3>
      </div>
    )}
    <div className="flex-1 min-w-0">{children}</div>
  </motion.div>
);

export const ProfilePage: React.FC<ProfilePageProps> = ({ network }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentProfile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Automatically uses the authorizedID scoped cache from network.ts
        const html = await network.fetchWithCache(
          "student_profile_data",
          async () =>
            await network.fetchFragment("studentsRecord/StudentProfileAllView"),
        );
        const parsedData = parseStudentProfile(html);
        setData(parsedData);
      } catch (e) {
        console.error("Failed to load profile data:", e);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [network]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 animate-pulse bg-zinc-50 dark:bg-black">
        <Loader2 className="w-10 h-10 animate-spin text-black dark:text-white" />
        <span className="text-xs font-bold tracking-widest uppercase">
          Fetching Profile...
        </span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full overflow-y-auto bg-zinc-100 dark:bg-black p-4 md:p-6 text-zinc-200 font-mono custom-scrollbar">
      <div className="max-w-375 mx-auto grid grid-cols-1 md:grid-cols-6 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="md:col-span-4 bg-cyan-400 border-4 border-black rounded-4xl p-6 shadow-[8px_8px_0px_0px_#000] relative overflow-hidden group flex items-center min-h-50"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative z-10 w-full flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="shrink-0">
              <div className="w-32 h-32 md:w-36 md:h-36 rounded-4xl border-4 border-black bg-white overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-2 group-hover:rotate-0 transition-transform duration-300">
                {data.basic.photoUrl ? (
                  <img
                    src={data.basic.photoUrl}
                    className="w-full h-full object-cover"
                    alt="Student"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-100">
                    <User className="w-16 h-16 text-zinc-400" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center items-center md:items-start text-center md:text-left h-full">
              <h1 className="font-expanded font-black text-3xl md:text-5xl uppercase leading-none text-black tracking-tighter mb-4 drop-shadow-sm">
                {data.basic.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                <span className="bg-black text-white px-4 py-1.5 rounded-xl text-sm font-bold border-2 border-black font-mono tracking-widest shadow-sm">
                  {data.basic.regNo}
                </span>
                <span className="bg-white/40 text-black border-2 border-black/20 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-tight">
                  {data.basic.program}
                </span>
              </div>
              <div className="text-xs font-black text-black/70 space-y-1">
                <p>{data.basic.school}</p>
                <p className="opacity-60 font-mono tracking-tight">
                  {data.basic.email}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2 bg-yellow-400 border-4 border-black rounded-4xl p-6 flex flex-col justify-between shadow-[8px_8px_0px_0px_#000] relative overflow-hidden min-h-50"
        >
          <div className="absolute -bottom-8 -right-8 text-black/5">
            <Shield className="w-48 h-48" />
          </div>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4 gap-4">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-black/60 block mb-1">
                  Proctor
                </span>
                <h3 className="font-expanded font-black text-xl uppercase leading-tight text-black line-clamp-2">
                  {data.proctor.name}
                </h3>
                <p className="text-[10px] font-bold text-black/70 mt-1">
                  {data.proctor.designation}
                </p>
              </div>
              <div className="w-16 h-16 rounded-2xl border-4 border-black bg-white overflow-hidden shrink-0 shadow-sm">
                {data.proctor.photoUrl ? (
                  <img
                    src={data.proctor.photoUrl}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Shield className="m-auto w-8 h-8 text-zinc-300" />
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 bg-black/5 p-1.5 rounded-lg border border-black/10 text-xs font-bold text-black">
                <Smartphone className="w-3.5 h-3.5" /> {data.proctor.mobile}
              </div>
              <div className="flex items-center gap-2 bg-black/5 p-1.5 rounded-lg border border-black/10 text-[10px] font-bold text-black">
                <Mail className="w-3.5 h-3.5" />{" "}
                <span className="truncate">{data.proctor.email}</span>
              </div>
              <div className="flex items-center gap-2 bg-black/5 p-1.5 rounded-lg border border-black/10 text-[10px] font-bold text-black">
                <MapPin className="w-3.5 h-3.5" /> {data.proctor.cabin}
              </div>
            </div>
          </div>
        </motion.div>

        <BentoCard
          title="Personal"
          icon={User}
          delay={0.2}
          colSpan="md:col-span-2"
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4">
            <InfoRow label="App No" value={data.personal.appNo} />
            <InfoRow label="DOB" value={data.personal.dob} />
            <InfoRow label="Gender" value={data.personal.gender} />
            <InfoRow label="Blood" value={data.personal.bloodGroup} />
            <InfoRow label="Language" value={data.personal.nativeLanguage} />
            <InfoRow label="State" value={data.personal.nativeState} />
            <InfoRow label="Aadhar" value={data.personal.aadhar} />
            <InfoRow label="Nationality" value={data.personal.nationality} />
          </div>
          <div className="pt-3 border-t border-zinc-800 grid grid-cols-2 gap-3">
            <div className="bg-zinc-800/50 p-2 rounded-xl text-center border-2 border-zinc-800">
              <div className="text-xl font-black">{data.family.brothers}</div>
              <div className="text-[9px] font-bold uppercase text-zinc-500">
                Brothers
              </div>
            </div>
            <div className="bg-zinc-800/50 p-2 rounded-xl text-center border-2 border-zinc-800">
              <div className="text-xl font-black">{data.family.sisters}</div>
              <div className="text-[9px] font-bold uppercase text-zinc-500">
                Sisters
              </div>
            </div>
          </div>
        </BentoCard>

        <BentoCard
          title="Education"
          icon={GraduationCap}
          delay={0.3}
          colSpan="md:col-span-2"
        >
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-3">
            <InfoRow label="Degree" value={data.education.degree} />
            <InfoRow
              label="Qualification"
              value={data.education.qualification}
            />
            <InfoRow label="Board" value={data.education.board} />
            <InfoRow label="Year" value={data.education.year} />
          </div>
          <div className="bg-zinc-800/40 p-3 rounded-xl border-2 border-zinc-800">
            <span className="text-[9px] font-black uppercase text-zinc-500 block mb-1 tracking-widest">
              Previous Institution
            </span>
            <p className="text-xs font-bold leading-tight wrap-break-word">
              {data.education.school}
            </p>
          </div>
        </BentoCard>

        <BentoCard
          title="Location"
          icon={MapPin}
          delay={0.3}
          colSpan="md:col-span-2"
        >
          <div className="flex flex-col gap-4 h-full">
            <AddressCard title="Current Address" data={data.currentAddress} />
            <AddressCard
              title="Permanent Address"
              data={data.permanentAddress}
            />
          </div>
        </BentoCard>

        <BentoCard
          title="Father"
          icon={Briefcase}
          delay={0.4}
          colSpan="md:col-span-3"
          className="border-l-12 border-l-blue-500"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full items-center">
            <div className="space-y-1">
              <InfoRow label="Full Name" value={data.family.father.name} />
              <InfoRow
                label="Qualification"
                value={data.family.father.qualification}
              />
              <InfoRow
                label="Occupation"
                value={data.family.father.occupation}
              />
              <InfoRow
                label="Annual Income"
                value={data.family.father.income}
              />
              <div className="mt-2 p-2 bg-zinc-800/50 rounded-lg border border-zinc-800 text-center">
                <span className="text-[9px] font-bold text-zinc-500 block uppercase">
                  Guardian
                </span>
                <span className="text-xs font-black text-blue-400">
                  {data.family.guardian}
                </span>
              </div>
            </div>
            <AddressCard
              title="Father Official"
              data={data.family.father.address}
            />
          </div>
        </BentoCard>

        <BentoCard
          title="Hostel"
          icon={Building}
          delay={0.5}
          colSpan="md:col-span-3"
        >
          {data.hostel ? (
            <div className="flex gap-6 h-full items-center">
              <div className="bg-zinc-800 p-4 rounded-2xl border-4 border-zinc-800 text-center flex flex-col justify-center min-w-30 shadow-inner shrink-0">
                <div className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">
                  Room
                </div>
                <div className="text-4xl font-black text-white">
                  {data.hostel.room}
                </div>
                <div className="text-[10px] font-bold opacity-60 mt-1 truncate max-w-full px-1">
                  {data.hostel.block}
                </div>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                <InfoRow label="Bed Type" value={data.hostel.bedType} />
                <InfoRow label="Mess Plan" value={data.hostel.mess} />
                <InfoRow label="App No" value={data.hostel.appNo} />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8 border-4 border-dashed border-zinc-800 rounded-3xl text-zinc-500 font-black uppercase tracking-widest">
              Day Boarder
            </div>
          )}
        </BentoCard>
      </div>
    </div>
  );
};
