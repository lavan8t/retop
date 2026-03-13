import React, { useState, useEffect } from "react";
import { StudentProfile } from "../types/vtop";
import { MOCK_PROFILE } from "../utils/mock-data";
import {
  User,
  Smartphone,
  Mail,
  MapPin,
  Loader2,
  GraduationCap,
  Briefcase,
  Building,
  Shield,
  HeartPulse,
} from "lucide-react";
import { motion } from "framer-motion";

// Keep network prop optional so ContentRouter doesn't complain
interface ProfilePageProps {
  network?: any;
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col border-b-2 border-black/10 py-1.5 last:border-0 hover:bg-black/5 px-2 -mx-2 rounded transition-colors overflow-hidden">
    <span className="text-[10px] font-black uppercase tracking-widest text-black/60 mb-0.5 truncate">
      {label}
    </span>
    <span className="text-sm font-bold font-mono text-black whitespace-normal wrap-break-word leading-tight">
      {value && value !== "-" ? (
        value
      ) : (
        <span className="text-black/30">-</span>
      )}
    </span>
  </div>
);

const AddressCard = ({ title, data }: { title: string; data: any }) => (
  <div className="bg-white/50 p-3 rounded-xl border-2 border-black h-full flex flex-col justify-center min-w-0">
    <h4 className="text-[10px] font-black uppercase tracking-widest text-black/70 mb-2 flex items-center gap-2 border-b-2 border-black/20 pb-1.5 shrink-0">
      <MapPin className="w-3 h-3" /> {title}
    </h4>
    <div className="space-y-1 overflow-hidden">
      <div className="text-sm font-black text-black leading-tight wrap-break-word">
        {data.street}
      </div>
      <div className="text-[10px] font-mono text-black/70 truncate">
        {data.area}
      </div>
      <div className="text-[10px] font-mono text-black/70 truncate">
        {data.city}, {data.state}
      </div>
      <div className="text-[10px] font-mono text-black/70 truncate">
        {data.country} -{" "}
        <span className="text-black font-bold">{data.pincode}</span>
      </div>
      {data.phone && data.phone !== "-" && (
        <div className="text-[10px] font-bold flex items-center gap-2 mt-2 text-black pt-2 border-t border-black/20 shrink-0">
          <Smartphone className="w-3 h-3" /> {data.phone}
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
  className = "bg-white",
}: any) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay }}
    className={`border-4 border-black text-black rounded-3xl p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all flex flex-col min-w-0 ${colSpan} ${className}`}
  >
    {title && (
      <div className="flex items-center gap-3 mb-3 pb-2 border-b-4 border-black shrink-0">
        <div className="p-1.5 bg-black text-white rounded-lg shadow-sm">
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-expanded font-black text-lg uppercase tracking-tight truncate">
          {title}
        </h3>
      </div>
    )}
    <div className="flex-1 min-w-0">{children}</div>
  </motion.div>
);

const toTitleCase = (str: string) => {
  if (!str) return "";
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
  );
};

const DigitalIDCard = ({ data }: { data: StudentProfile }) => {
  const isHosteller = !!data.hostel;
  const address = data.permanentAddress;
  const contactNo =
    data.permanentAddress.phone !== "-"
      ? data.permanentAddress.phone
      : data.personal.mobile || "Not Provided";

  const fontArial = "!font-['Arial',_Helvetica,_sans-serif]";
  const fontTimes = "!font-['Times_New_Roman',_Times,_serif]";

  return (
    <div className="group w-full max-w-74 mx-auto aspect-64/100 perspective-[1000px] cursor-pointer shrink-0">
      <div className="relative w-full h-full transition-transform duration-700 transform-3d group-hover:transform-[rotateY(180deg)] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl">
        {/* FRONT SIDE */}
        <div
          className={`absolute inset-0 backface-hidden bg-white rounded-2xl border-2 border-zinc-400 flex flex-col overflow-hidden text-black ${fontArial}`}
        >
          <div className="flex flex-col items-center pt-3 px-3 shrink-0">
            <div className="w-47.5 mx-auto flex justify-center h-16.25 items-center">
              <img
                src="/assets/black-retop.svg"
                alt="ReTop Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center top-1 items-center px-4 w-full">
            <div className="w-38.5 h-59 overflow-hidden flex items-center justify-center z-10">
              {data.basic.photoUrl ? (
                <img
                  src={data.basic.photoUrl}
                  className="w-full h-full object-contain brightness-110"
                  alt="Student"
                />
              ) : (
                <User className="w-20 h-20 text-zinc-300" />
              )}
            </div>
          </div>
          <div className={`flex flex-col items-center shrink-0 pb-1`}>
            <div
              className={`font-bold text-[25px] ${fontArial} text-[#181d79] tracking-tight leading-none text-center px-2`}
            >
              {toTitleCase(data.basic.name)}
            </div>
            <div
              className={`font-bold text-[18px] ${fontArial} text-black mt-4`}
            >
              {data.basic.regNo}
            </div>
          </div>
          <div
            className={`text-[#ffffff] text-center py-1 font-bold text-[22px] tracking-wide shrink-0 ${fontArial}`}
            style={{ backgroundColor: isHosteller ? "#181d79" : "#C41E3A" }}
          >
            {isHosteller ? "HOSTELLER" : "DAY SCHOLAR"}
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="absolute inset-0 backface-hidden transform-[rotateY(180deg)] bg-white rounded-2xl border-2 border-zinc-400 flex flex-col p-3 text-black text-[12px] leading-tight overflow-hidden">
          <div className="flex gap-1">
            <span className={`italic font-bold ${fontTimes}`}>App. No:</span>{" "}
            <span className={`font-bold ml-1 ${fontArial}`}>
              {data.personal.appNo}
            </span>
          </div>
          <div className="flex gap-1 mt-1">
            <span className={`italic font-bold ${fontTimes}`}>
              Blood Group :
            </span>{" "}
            <span className={`font-bold ml-1 ${fontArial}`}>
              {data.personal.bloodGroup}
            </span>
          </div>
          <div className={`mt-1.5 italic font-bold ${fontTimes}`}>
            Official Address :
          </div>
          <div
            className={`font-bold ml-2 text-[11px] leading-snug ${fontArial}`}
          >
            ReTop Global University,
            <br />
            Innovation Park - 560 001, Karnataka, India.
            <br />
            Ph : 080 1234 5678
            <br />
            Fax : 080 1234 5679
          </div>
          <div className={`mt-1.5 italic font-bold ${fontTimes}`}>
            Address :
          </div>
          <div
            className={`font-bold ml-2 text-[11px] leading-snug uppercase ${fontArial}`}
          >
            {address.street !== "-" ? `${address.street},` : ""}
            <br />
            {address.area}, {address.city},<br />
            {address.pincode}, {address.state},<br />
            {address.country}
          </div>
          <div className={`mt-1.5 italic font-bold ${fontTimes}`}>
            Contact No. :
          </div>
          <div className={`font-bold ml-2 text-[13px] ${fontArial}`}>
            {contactNo}
          </div>
          <div className="mt-1.5 flex gap-1">
            <span className={`italic font-bold ${fontTimes}`}>
              Valid Upto :
            </span>{" "}
            <span className={`font-bold text-[13px] ml-1 ${fontArial}`}>
              JUL-2028
            </span>
          </div>
          <div className="mt-2 flex justify-between text-[11px] italic items-end">
            <div className="text-center flex flex-col items-center">
              <span className="text-xl -mb-2 text-black/70 italic font-['cursive']!"></span>
              <span className={fontTimes}> </span>
            </div>
            <div className="text-center flex flex-col items-center">
              <span className="text-xl -mb-2 text-black/70 italic font-['cursive']!"></span>
              <span className={fontTimes}> </span>
            </div>
          </div>
          <div className="mt-auto flex flex-col items-center">
            <img
              src={`https://barcode.tec-it.com/barcode.ashx?data=${data.basic.regNo}&code=Code128`}
              alt="Barcode"
              className="w-[68%] h-auto mix-blend-multiply"
            />
            <div className={`font-bold text-[13px] ${fontTimes}`}>
              Website : retop.web.app
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfilePage: React.FC<ProfilePageProps> = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentProfile | null>(null);

  useEffect(() => {
    // Simulate a network call with our Mock Data
    const timer = setTimeout(() => {
      setData(MOCK_PROFILE);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 animate-pulse bg-zinc-50 dark:bg-zinc-900">
        <Loader2 className="w-10 h-10 animate-spin text-black dark:text-white" />
        <span className="text-xs font-bold tracking-widest uppercase">
          Fetching Profile...
        </span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full overflow-y-auto bg-(--bg-main) p-4 md:p-8 font-mono custom-scrollbar">
      <div className="max-w-375 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* LEFT COLUMN: ID CARD & ACADEMIC SPILLOVER */}
        <div className="lg:col-span-4 flex flex-col gap-6 md:gap-8 items-center lg:items-stretch">
          <DigitalIDCard data={data} />

          <BentoCard
            title="Academic Details"
            icon={GraduationCap}
            delay={0.1}
            className="bg-[#c4f135]"
          >
            <div className="space-y-3">
              <div className="bg-white/40 p-3 rounded-xl border-2 border-black">
                <div className="text-[10px] font-black uppercase tracking-widest text-black/60 mb-0.5">
                  Program
                </div>
                <div className="text-base font-black leading-tight">
                  {data.basic.program}
                </div>
              </div>
              <div className="bg-white/40 p-3 rounded-xl border-2 border-black">
                <div className="text-[10px] font-black uppercase tracking-widest text-black/60 mb-0.5">
                  School
                </div>
                <div className="text-sm font-bold leading-tight">
                  {data.basic.school}
                </div>
              </div>
              <div className="bg-white/40 p-3 rounded-xl border-2 border-black">
                <div className="text-[10px] font-black uppercase tracking-widest text-black/60 mb-0.5">
                  Institutional Email
                </div>
                <div className="text-sm font-bold leading-tight break-all">
                  {data.basic.email}
                </div>
              </div>
            </div>
          </BentoCard>
        </div>

        {/* RIGHT COLUMN: REMAINING STUDENT DATA */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 auto-rows-max">
          <BentoCard
            title="Proctor Profile"
            icon={Shield}
            delay={0.2}
            colSpan="md:col-span-2"
            className="bg-[#ffd500]"
          >
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-stretch">
              <div className="w-28 h-36 border-4 border-black bg-white rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-3 shrink-0 flex items-center justify-center p-1">
                {data.proctor.photoUrl ? (
                  <img
                    src={data.proctor.photoUrl}
                    className="w-full h-full object-cover rounded-lg"
                    alt="Proctor"
                  />
                ) : (
                  <Shield
                    color="#e5e5e5"
                    className="w-12 h-12 text-[#e5e5e5]"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center w-full">
                <h3 className="font-expanded font-black text-2xl uppercase leading-none mb-1 text-black">
                  {data.proctor.name}
                </h3>
                <p className="text-xs font-bold text-black/70 mb-4 tracking-tight">
                  {data.proctor.designation}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 bg-white/40 p-2 rounded-lg border-2 border-black text-xs font-bold">
                    <Smartphone className="w-4 h-4 shrink-0" />{" "}
                    {data.proctor.mobile}
                  </div>
                  <div className="flex items-center gap-2 bg-white/40 p-2 rounded-lg border-2 border-black text-xs font-bold">
                    <MapPin className="w-4 h-4 shrink-0" /> {data.proctor.cabin}
                  </div>
                  <div className="flex items-center gap-2 bg-white/40 p-2 rounded-lg border-2 border-black text-xs font-bold sm:col-span-2">
                    <Mail className="w-4 h-4 shrink-0" />{" "}
                    <span className="truncate">{data.proctor.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </BentoCard>

          <BentoCard
            title="Guardian / Father"
            icon={Briefcase}
            delay={0.3}
            colSpan="md:col-span-2"
            className="bg-[#ff6b6b]"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-xl border-4 border-black shadow-inner space-y-1">
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
                <div className="mt-4 p-2 bg-black text-white rounded-lg border-2 border-black text-center flex items-center justify-between px-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                    Local Guardian
                  </span>
                  <span className="text-sm font-black">
                    {data.family.guardian || "N/A"}
                  </span>
                </div>
              </div>
              <AddressCard
                title="Official Address"
                data={data.family.father.address}
              />
            </div>
          </BentoCard>

          <div className="grid grid-cols-1 gap-6 md:gap-8 md:col-span-2 md:grid-cols-2">
            <BentoCard
              title="Personal"
              icon={HeartPulse}
              delay={0.4}
              className="bg-cyan-300"
            >
              <div className="bg-white p-3 rounded-xl border-2 border-black space-y-1">
                <InfoRow label="DOB" value={data.personal.dob} />
                <InfoRow label="Gender" value={data.personal.gender} />
                <InfoRow
                  label="Language"
                  value={data.personal.nativeLanguage}
                />
                <InfoRow
                  label="Native State"
                  value={data.personal.nativeState}
                />
                <InfoRow
                  label="Nationality"
                  value={data.personal.nationality}
                />
              </div>
            </BentoCard>

            <BentoCard
              title="Education"
              icon={GraduationCap}
              delay={0.4}
              className="bg-[#a8a4ff]"
            >
              <div className="bg-white p-3 rounded-xl border-2 border-black space-y-1 mb-4">
                <InfoRow label="Degree" value={data.education.degree} />
                <InfoRow
                  label="Qualification"
                  value={data.education.qualification}
                />
                <InfoRow label="Board" value={data.education.board} />
                <InfoRow label="Passing Year" value={data.education.year} />
              </div>

              <div className="bg-white p-3 rounded-xl border-2 border-black text-center">
                <span className="text-[10px] font-black uppercase text-black/50 block mb-1 tracking-widest">
                  Previous Institution
                </span>
                <p className="text-xs font-bold leading-tight line-clamp-2">
                  {data.education.school}
                </p>
              </div>
            </BentoCard>
          </div>

          <BentoCard
            title="Hostel Allocation"
            icon={Building}
            delay={0.5}
            colSpan="md:col-span-2"
            className="bg-[#ff9e42]"
          >
            {data.hostel ? (
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="bg-black p-6 rounded-2xl border-4 border-black text-center flex flex-col justify-center w-full sm:w-auto min-w-35 shadow-inner shrink-0 rotate-1">
                  <div className="text-[10px] uppercase font-black text-white/50 tracking-widest mb-1">
                    Room No.
                  </div>
                  <div className="text-5xl font-black text-white">
                    {data.hostel.room}
                  </div>
                  <div className="text-[11px] font-bold text-[#ff9e42] mt-2 bg-white/10 py-1 rounded-md px-2 truncate max-w-full">
                    {data.hostel.block}
                  </div>
                </div>

                <div className="flex-1 space-y-2 w-full bg-white p-4 rounded-xl border-4 border-black">
                  <InfoRow label="Bed Type" value={data.hostel.bedType} />
                  <InfoRow label="Mess Plan" value={data.hostel.mess} />
                  <InfoRow label="Hostel App No" value={data.hostel.appNo} />
                </div>
              </div>
            ) : (
              <div className="h-full w-full flex items-center justify-center p-8 bg-white border-4 border-dashed border-black rounded-2xl text-black/40 font-black text-xl uppercase tracking-widest text-center">
                Registered As
                <br />
                Day Boarder
              </div>
            )}
          </BentoCard>
        </div>
      </div>
    </div>
  );
};
