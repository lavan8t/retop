import React, { useState, useEffect } from "react";
import { VTOPNetwork } from "../utils/network";
import { parseStudentProfile } from "../parsers/profile";
import { StudentProfile } from "../types/vtop";
import { VitLogo } from "../components/VitLogo";
import {
  Person,
  Mobile,
  Mail,
  LocationOn,
  ProgressActivity,
  School,
  Work,
  Domain,
  Shield,
  MonitorHeart,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { motion } from "framer-motion";
import Barcode from "react-barcode";

const CopyableText = ({ text, children, className = "" }: { text: string, children?: React.ReactNode, className?: string }) => {
  return (
    <span 
      className={`cursor-pointer hover:underline decoration-2 underline-offset-4 transition-all ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        window.dispatchEvent(new CustomEvent("retop-toast", { detail: { message: "Copied!", type: "info" } }));
      }}
      title="Click to copy"
    >
      {children || text}
    </span>
  );
};

interface ProfilePageProps {
  network: VTOPNetwork;
}

const MarqueeText = ({ children, className = "" }: any) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const textRef = React.useRef<HTMLSpanElement>(null);
  const [isOverflow, setIsOverflow] = React.useState(false);

  React.useEffect(() => {
    const check = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflow(textRef.current.scrollWidth > containerRef.current.clientWidth);
      }
    };
    check();
    setTimeout(check, 200);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [children]);

  return (
    <div ref={containerRef} className={`w-full overflow-hidden flex py-1.5 ${className}`}>
      {!isOverflow ? (
        <span ref={textRef} className="truncate whitespace-nowrap block w-full">{children}</span>
      ) : (
        <div className="flex shrink-0 w-fit items-center" style={{ animation: 'scrollX 15s linear infinite' }}>
          <style>{`
            @keyframes scrollX {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
          <div className="shrink-0 flex pr-16 whitespace-nowrap">{children}</div>
          <div className="shrink-0 flex pr-16 whitespace-nowrap">{children}</div>
        </div>
      )}
    </div>
  );
};

const isValid = (val: string | null | undefined) => val && val !== "-" && val.trim() !== "" && val.toUpperCase() !== "N/A" && val.toUpperCase() !== "NA";

const BentoBlock = ({ title, value, span = "col-span-1", children, className = "" }: any) => {
  if (value !== undefined && !isValid(value)) return null;
  
  return (
    <div 
      className={`relative p-6 bg-(--bg-surface) text-(--text-main) hover:text-(--bg-main) rounded-[2rem] border-4 border-(--border-main) shadow-none hover:shadow-[var(--brutal-shadow-hover)] transition-all duration-fast ease-out group flex flex-col justify-between gap-4 overflow-hidden ${span} ${className}`}
    >
      <div className="absolute -inset-1 bg-(--accent-base) opacity-0 group-hover:opacity-100 transition-opacity duration-fast ease-out z-0"></div>
      
      <div className="relative z-10 flex flex-col justify-between h-full gap-4 w-full">
         <div className="text-[10px] md:text-xs uppercase font-black font-expanded tracking-widest opacity-50 shrink-0 group-hover:opacity-80 transition-opacity duration-fast">{title}</div>
         {value ? (
             <div className="text-xl md:text-2xl lg:text-3xl font-black font-expanded leading-tight transition-all duration-fast group-hover:font-squish origin-left w-full py-1">
               <MarqueeText>{value}</MarqueeText>
             </div>
         ) : (
             <div className="transition-all duration-fast origin-left w-full h-full flex flex-col justify-end text-sm md:text-base font-black font-expanded gap-1 py-1">{children}</div>
         )}
      </div>
    </div>
  );
};

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
    data.permanentAddress.phone || data.personal.mobile || "Not Provided";

  // Strict font enforcement
  const fontArial = "font-['Arial',Helvetica,sans-serif]!";
  const fontTimes = "font-['Times_New_Roman',Times,serif]!";

  return (
    <div className="group w-full max-w-74 mx-auto aspect-64/100 perspective-[1000px] cursor-pointer shrink-0">
      {/* Container for 3D flip */}
      <div className="relative w-full h-full transition-transform duration-normal transform-3d group-hover:transform-[rotateY(180deg)] shadow-none rounded-2xl">
        {/* FRONT SIDE */}
        <div
          className={`absolute inset-0 backface-hidden bg-white rounded-2xl border-2 border-zinc-400 flex flex-col overflow-hidden text-black ${fontArial}`}
        >
          {/* Header */}
          <div className="flex flex-col items-center pt-3 px-3 shrink-0">
            <div className="w-47.5 mx-auto flex justify-center [&>svg]:w-full [&>svg]:h-[auto!important] [&>svg]:max-h-16.25">
              <VitLogo />
            </div>

            <h3
              className={`text-[17px] font-extrabold scale-x-120 text-black ${fontTimes}`}
            >
              VELLORE CAMPUS
            </h3>
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
                <Person className="w-20 h-20 text-zinc-300" />
              )}
            </div>
          </div>

          <div className={`flex flex-col items-center shrink-0 pb-1`}>
            <div
              className={`font-bold text-[25px] ${fontArial} text-[#181d79] leading-none text-center px-2`}
            >
              {toTitleCase(data.basic.name)}
            </div>
            <div
              className={`font-bold text-[18px] ${fontArial} text-black mt-4`}
            >
              {data.basic.regNo}
            </div>
          </div>

          {/* Footer Banner */}
          <div
            className={`text-[#ffffff] text-center py-1 font-bold text-[22px] shrink-0 ${fontArial}`}
            style={{
              backgroundColor: isHosteller ? "#181d79" : "#C41E3A",
            }}
          >
            {isHosteller ? "HOSTELLER" : "DAY SCHOLAR"}
          </div>
        </div>

        {/* BACK SIDE */}
        <div
          className={`absolute inset-0 backface-hidden transform-[rotateY(180deg)] bg-white rounded-2xl border-2 border-zinc-400 flex flex-col p-3 text-black text-[12px] leading-tight overflow-hidden`}
        >
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
            Vellore Institute of Technology,
            <br />
            Vellore - 632 014, Tamilnadu, India.
            <br />
            Ph : 0416 224 3091
            <br />
            Fax : 0416 224 3092
          </div>

          <div className={`mt-1.5 italic font-bold ${fontTimes}`}>
            Address :
          </div>
          <div
            className={`font-bold ml-2 text-[11px] leading-snug uppercase ${fontArial}`}
          >
            {address.street},<br />
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
              <span className="text-xl -mb-2 text-zinc-500 italic font-['cursive']!"></span>
              <span className={fontTimes}> </span>
            </div>
            <div className="text-center flex flex-col items-center">
              <span className="text-xl -mb-2 text-zinc-500 italic font-['cursive']!"></span>
              <span className={fontTimes}> </span>
            </div>
          </div>

          {/* TEC-IT API Barcode Replaced with react-barcode */}
          <div className="mt-auto flex flex-col items-center pb-1">
            <div className="w-[85%] flex justify-center bg-white px-2 py-2 rounded-sm mix-blend-multiply opacity-90">
              <Barcode
                value={data.basic.regNo}
                displayValue={true}
                height={75}
                width={2}
                fontSize={16}
                margin={0}
                format="CODE128"
                background="transparent"
                lineColor="#000000"
              />
            </div>
            <div className={`font-bold text-[13px] ${fontTimes} mt-1`}>
              Website : www.vit.ac.in
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfilePage: React.FC<ProfilePageProps> = ({ network }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentProfile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
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
      <div className="h-full overflow-y-auto bg-(--bg-main) p-4 md:p-8 pt-20 md:pt-24 lg:pt-28 custom-scrollbar">
        <div className="max-w-[1380px] mx-auto flex flex-col gap-12 md:gap-20 animate-pulse pb-20">
          <div className="w-full max-w-74 mx-auto aspect-64/100 bg-(--bg-surface) rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-4">
             <div className="md:col-span-2 h-40 bg-(--bg-surface)" />
             <div className="md:col-span-2 h-40 bg-(--bg-surface)" />
             <div className="md:col-span-2 h-40 bg-(--bg-surface)" />
             <div className="col-span-1 h-40 bg-(--bg-surface)" />
             <div className="col-span-1 h-40 bg-(--bg-surface)" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full w-full overflow-y-auto bg-(--bg-main) p-4 md:p-8 pt-20 md:pt-24 lg:pt-28 font-mono custom-scrollbar">
      <div className="max-w-[1380px] mx-auto flex flex-col pb-20">
        
        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 grid-flow-dense auto-rows-max">

          <BentoBlock title="Program" value={data.basic.program} span="md:col-span-2 lg:col-span-4" />
          <BentoBlock title="School" value={data.basic.school} span="md:col-span-2 lg:col-span-4" />
          
          {isValid(data.basic.email) && (
             <BentoBlock title="Institutional Email" span="md:col-span-2 lg:col-span-4">
                <div className="text-xl md:text-2xl lg:text-3xl font-black font-expanded leading-tight transition-all duration-fast group-hover:font-squish origin-left w-full py-1">
                   <MarqueeText><CopyableText text={data.basic.email} /></MarqueeText>
                </div>
             </BentoBlock>
          )}
          
          {/* CENTERED ID CARD (Auto-placed to center via col-start) */}
          <div className="md:col-span-2 lg:col-span-2 lg:col-start-2 lg:row-span-4 flex justify-center items-center w-full shrink-0 z-10 py-1 mb-8 -mx-2 md:mx-0">
            <DigitalIDCard data={data} />
          </div>

          {/* SATELLITE BLOCKS (Backfilling left and right of ID card) */}
          <BentoBlock title="Blood Group" value={data.personal.bloodGroup} />
          <BentoBlock title="Date of Birth" value={data.personal.dob} />
          <BentoBlock title="Gender" value={data.personal.gender} />
          <BentoBlock title="Nationality" value={data.personal.nationality} />

          {/* ROW 5+ (Below ID card) */}
          
          {(isValid(data.personal.mobile) || isValid(data.personal.email)) && (
            <BentoBlock title="Personal Contact" span="md:col-span-2 lg:col-span-2">
               {isValid(data.personal.mobile) && <div className="text-2xl md:text-3xl leading-tight"><CopyableText text={data.personal.mobile} /></div>}
               {isValid(data.personal.email) && <div className="text-sm md:text-base opacity-70 normal-case lowercase mt-1"><MarqueeText><CopyableText text={data.personal.email} /></MarqueeText></div>}
            </BentoBlock>
          )}

          {(isValid(data.personal.religion) || isValid(data.personal.community) || isValid(data.personal.caste)) && (
            <BentoBlock title="Demographics" span="md:col-span-2 lg:col-span-2">
               <div className="flex flex-col sm:flex-row gap-x-6 gap-y-2">
                  {isValid(data.personal.religion) && <div><span className="opacity-50 text-[10px] block">Religion</span>{data.personal.religion}</div>}
                  {isValid(data.personal.community) && <div><span className="opacity-50 text-[10px] block">Community</span>{data.personal.community}</div>}
                  {isValid(data.personal.caste) && <div><span className="opacity-50 text-[10px] block">Caste</span>{data.personal.caste}</div>}
               </div>
            </BentoBlock>
          )}
          
          {(isValid(data.personal.nativeLanguage) || isValid(data.personal.nativeState) || isValid(data.personal.physicallyChallenged)) && (
            <BentoBlock title="Background" span="md:col-span-2 lg:col-span-2">
               <div className="flex flex-col sm:flex-row gap-x-6 gap-y-2">
                  {isValid(data.personal.nativeLanguage) && <div><span className="opacity-50 text-[10px] block">Language</span>{data.personal.nativeLanguage}</div>}
                  {isValid(data.personal.nativeState) && <div><span className="opacity-50 text-[10px] block">State</span>{data.personal.nativeState}</div>}
                  {isValid(data.personal.physicallyChallenged) && <div><span className="opacity-50 text-[10px] block">Accessibility Needs</span>{data.personal.physicallyChallenged}</div>}
               </div>
            </BentoBlock>
          )}

          {isValid(data.currentAddress.street) && (
            <BentoBlock title="Current Address" span="md:col-span-2 lg:col-span-2">
               <div className="text-lg md:text-xl leading-tight">{data.currentAddress.street}</div>
               <div className="opacity-70 text-sm mt-2">{data.currentAddress.area}, {data.currentAddress.city}</div>
               <div className="opacity-50 text-xs mt-1">{data.currentAddress.state}, {data.currentAddress.country} - {data.currentAddress.pincode}</div>
               {isValid(data.currentAddress.phone) && <div className="mt-2 text-xl"><CopyableText text={data.currentAddress.phone} /></div>}
            </BentoBlock>
          )}
          
          {isValid(data.permanentAddress.street) && (
            <BentoBlock title="Permanent Address" span="md:col-span-2 lg:col-span-2">
               <div className="text-lg md:text-xl leading-tight">{data.permanentAddress.street}</div>
               <div className="opacity-70 text-sm mt-2">{data.permanentAddress.area}, {data.permanentAddress.city}</div>
               <div className="opacity-50 text-xs mt-1">{data.permanentAddress.state}, {data.permanentAddress.country} - {data.permanentAddress.pincode}</div>
               {isValid(data.permanentAddress.phone) && <div className="mt-2 text-xl"><CopyableText text={data.permanentAddress.phone} /></div>}
            </BentoBlock>
          )}

          {(isValid(data.proctor.name) || isValid(data.proctor.mobile)) && (
            <div className="relative md:col-span-2 lg:col-span-4 bg-(--bg-surface) text-(--text-main) hover:text-(--bg-main) rounded-[2rem] border-4 border-(--border-main) shadow-none hover:shadow-[var(--brutal-shadow-hover)] transition-all duration-fast ease-out group flex overflow-hidden">
               <div className="absolute -inset-1 bg-(--accent-base) opacity-0 group-hover:opacity-100 transition-opacity duration-fast ease-out z-0"></div>

               {data.proctor.photoUrl && (
                  <div className="relative z-10 w-[35%] lg:w-[20%] shrink-0 h-full">
                     <img src={data.proctor.photoUrl} className="w-full h-full object-cover transition-all duration-fast" alt="Proctor" />
                  </div>
               )}
               <div className="relative z-10 p-6 flex flex-col justify-between gap-4 flex-1 overflow-hidden w-full">
                  <div className="text-[10px] md:text-xs uppercase font-black font-expanded tracking-widest opacity-50 shrink-0 group-hover:opacity-80 transition-opacity duration-fast">Proctor Information</div>
                  <div className="transition-all duration-fast origin-left w-full flex flex-col md:flex-row justify-between text-sm md:text-base font-black font-expanded gap-6 md:gap-4 group-hover:scale-[1.01]">
                     
                     <div className="flex flex-col justify-end gap-1 flex-1 min-w-0">
                        {isValid(data.proctor.name) && <div className="text-2xl md:text-3xl leading-tight"><MarqueeText>{data.proctor.name}</MarqueeText></div>}
                        {isValid(data.proctor.designation) && <div className="opacity-70 mt-1"><MarqueeText>{data.proctor.designation}</MarqueeText></div>}
                        {isValid(data.proctor.school) && <div className="opacity-50 text-[10px] md:text-xs mt-1"><MarqueeText>{data.proctor.school} • {data.proctor.dept}</MarqueeText></div>}
                     </div>

                     <div className="flex flex-col justify-end gap-1 md:text-right md:items-end shrink-0 md:max-w-[45%] min-w-0">
                        {isValid(data.proctor.mobile) && <div className="text-2xl md:text-3xl leading-tight"><CopyableText text={data.proctor.mobile} /></div>}
                        {isValid(data.proctor.email) && <div className="opacity-70 normal-case lowercase mt-1"><MarqueeText><CopyableText text={data.proctor.email} /></MarqueeText></div>}
                        {isValid(data.proctor.cabin) && <div className="opacity-50 text-[10px] md:text-xs mt-1 py-1.5">Cabin: {data.proctor.cabin}</div>}
                     </div>

                  </div>
               </div>
            </div>
          )}

          {data.hostel ? (
             <BentoBlock title="Hostel Details" span="md:col-span-2 lg:col-span-4" className="border-2 border-(--border-main) shadow-[var(--brutal-shadow)]">
                <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-end py-1">
                   <div className="flex items-end gap-3 lg:gap-4">
                      <span className="text-6xl md:text-7xl font-black font-expanded leading-tight">{data.hostel.room}</span>
                      <span className="text-2xl md:text-3xl opacity-60 pb-1">{data.hostel.block}</span>
                   </div>
                   <div className="flex flex-col sm:items-end text-left sm:text-right">
                      {isValid(data.hostel.mess) && <div className="text-xl md:text-2xl leading-tight">{data.hostel.mess}</div>}
                      {isValid(data.hostel.bedType) && <div className="text-sm md:text-base opacity-60 mt-1 uppercase tracking-widest font-black font-expanded">{data.hostel.bedType} Bed</div>}
                   </div>
                </div>
             </BentoBlock>
          ) : (
             <BentoBlock title="Accommodation" value="Day Scholar" span="md:col-span-2 lg:col-span-4" className="!bg-(--bg-highlight) text-center items-center justify-center py-16" />
          )}

          {isValid(data.education.school) && (
            <BentoBlock title="Previous Education" span="md:col-span-2 lg:col-span-2">
               <div className="text-lg md:text-xl leading-tight"><MarqueeText>{data.education.school}</MarqueeText></div>
               <div className="opacity-70 text-sm mt-2">{data.education.board} {isValid(data.education.medium) && `• Medium: ${data.education.medium}`}</div>
               <div className="opacity-50 text-xs mt-1">Year: {data.education.year}-{data.education.month} • Reg: {data.education.regNo}</div>
            </BentoBlock>
          )}
          {isValid(data.education.degree) && (
            <BentoBlock title="Degree & Qual" span="md:col-span-2 lg:col-span-2">
               <div className="text-xl leading-tight"><MarqueeText>{data.education.degree} - {data.education.branch}</MarqueeText></div>
               <div className="opacity-70 mt-2"><MarqueeText>{data.education.qualification}</MarqueeText></div>
               <div className="opacity-50 text-xs mt-1">Class: {data.education.classObtained}</div>
               {data.education.breakInStudy === "Yes" && (
                  <div className="text-red-500 text-xs mt-1">Break: {data.education.breakReason}</div>
               )}
            </BentoBlock>
          )}

          {isValid(data.family.father.name) && (
            <>
              <BentoBlock title="Father's Profile" span="md:col-span-2 lg:col-span-2">
                 <div className="text-2xl md:text-3xl leading-tight"><MarqueeText>{data.family.father.name}</MarqueeText></div>
                 <div className="opacity-70 text-sm mt-2">
                    <MarqueeText>{[data.family.father.designation, data.family.father.organization].filter(isValid).join(" at ") || "No Work Info"}</MarqueeText>
                 </div>
                 <div className="opacity-50 text-xs mt-1"><MarqueeText>{data.family.father.qualification} • {data.family.father.occupation} {isValid(data.family.father.income) && `• Income: ${data.family.father.income}`}</MarqueeText></div>
              </BentoBlock>
              <BentoBlock title="Father's Contact" span="md:col-span-2 lg:col-span-2">
                 {isValid(data.family.father.mobile) && <div className="text-2xl md:text-3xl leading-tight"><CopyableText text={data.family.father.mobile} /></div>}
                 {isValid(data.family.father.email) && <div className="opacity-70 normal-case lowercase mt-2"><MarqueeText><CopyableText text={data.family.father.email} /></MarqueeText></div>}
                 {isValid(data.family.father.address.city) && <div className="opacity-50 text-xs mt-1">{data.family.father.address.city}, {data.family.father.address.state}</div>}
              </BentoBlock>
            </>
          )}

          {isValid(data.family.mother.name) && (
            <>
              <BentoBlock title="Mother's Profile" span="md:col-span-2 lg:col-span-2">
                 <div className="text-2xl md:text-3xl leading-tight"><MarqueeText>{data.family.mother.name}</MarqueeText></div>
                 <div className="opacity-70 text-sm mt-2">
                    <MarqueeText>{[data.family.mother.designation, data.family.mother.organization].filter(isValid).join(" at ") || "No Work Info"}</MarqueeText>
                 </div>
                 <div className="opacity-50 text-xs mt-1"><MarqueeText>{data.family.mother.qualification} • {data.family.mother.occupation} {isValid(data.family.mother.income) && `• Income: ${data.family.mother.income}`}</MarqueeText></div>
              </BentoBlock>
              <BentoBlock title="Mother's Contact" span="md:col-span-2 lg:col-span-2">
                 {isValid(data.family.mother.mobile) && <div className="text-2xl md:text-3xl leading-tight"><CopyableText text={data.family.mother.mobile} /></div>}
                 {isValid(data.family.mother.email) && <div className="opacity-70 normal-case lowercase mt-2"><MarqueeText><CopyableText text={data.family.mother.email} /></MarqueeText></div>}
                 {isValid(data.family.mother.address.city) && <div className="opacity-50 text-xs mt-1">{data.family.mother.address.city}, {data.family.mother.address.state}</div>}
              </BentoBlock>
            </>
          )}

          <BentoBlock title="Family Extras" span="md:col-span-2 lg:col-span-4">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                <div>
                   <div className="opacity-50 text-[10px]">Siblings</div>
                   <div className="mt-1">B: {data.family.brothers} • S: {data.family.sisters}</div>
                </div>
                <div>
                   <div className="opacity-50 text-[10px]">VIT Relations</div>
                   <div className="mt-1">Studying: {data.family.studyingInVit} • Studied: {data.family.studiedInVit}</div>
                </div>
                <div>
                   <div className="opacity-50 text-[10px]">Local Guardian</div>
                   <div className="mt-1 line-clamp-2">{data.family.guardian}</div>
                </div>
                <div>
                   <div className="opacity-50 text-[10px]">Friend Mobile</div>
                   <div className="mt-1"><CopyableText text={data.family.friendMobile} /></div>
                </div>
             </div>
          </BentoBlock>

        </div>
      </div>
    </div>
  );
};
