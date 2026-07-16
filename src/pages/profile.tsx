import React, { useState, useEffect } from "react";
import { VTOPNetwork } from "../utils/network";
import { useDataStore } from "../store/dataStore";
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
  AlternateEmail,
  Cake,
  Bloodtype,
  Wc,
  Public
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

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



const isValid = (val: string | null | undefined) => val && val !== "-" && val.trim() !== "" && val.toUpperCase() !== "N/A" && val.toUpperCase() !== "NA";

const BentoBlock = ({ title, value, span = "col-span-1", children, className = "", icon: Icon }: any) => {
  if (value !== undefined && !isValid(value)) return null;
  
  return (
    <div 
      className={`relative p-5 md:p-6 bg-(--bg-surface) text-(--text-main) rounded-4xl transition-all duration-fast flex flex-col justify-between gap-4 overflow-hidden break-words whitespace-normal min-h-[140px] max-h-max ${span} ${className}`}
    >
      <div className="relative z-10 flex flex-col justify-between h-full gap-4 w-full">
         {Icon ? (
           <div className="flex items-start justify-between w-full h-full gap-4">
             <Icon className="w-8 h-8 md:w-10 md:h-10 text-(--text-main) mix-blend-overlay opacity-80 shrink-0" />
             <div className="flex flex-col items-end justify-end text-right h-full w-full min-w-0">
               {title && <div className="text-[10px] md:text-xs uppercase font-black font-expanded opacity-50 shrink-0 mb-2">{title}</div>}
               {value ? (
                   <div className="text-2xl md:text-3xl font-black font-expanded leading-none w-full break-words whitespace-normal py-1">
                     {value}
                   </div>
               ) : (
                   <div className="w-full flex flex-col items-end justify-end text-sm md:text-base font-black font-expanded gap-1 break-words whitespace-normal">{children}</div>
               )}
             </div>
           </div>
         ) : (
           <>
             {title && <div className="text-[10px] md:text-xs uppercase font-black font-expanded opacity-50 shrink-0 mb-2 text-right w-full">{title}</div>}
             {value ? (
                 <div className="text-xl md:text-2xl lg:text-3xl font-black font-expanded leading-tight w-full break-words whitespace-normal text-right">
                   {value}
                 </div>
             ) : (
                 <div className="w-full h-full flex flex-col justify-end text-sm md:text-base font-black font-expanded gap-1 break-words whitespace-normal text-right">{children}</div>
             )}
           </>
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
    <div className="group w-full max-w-74 aspect-64/100 perspective-[1000px] cursor-pointer shrink-0">
      {/* Container for 3D flip */}
      <div className="relative w-full h-full transition-transform duration-300 transform-3d group-hover:transform-[rotateY(180deg)] shadow-none rounded-2xl">
        {/* FRONT SIDE */}
        <div
          className={`absolute inset-0 backface-hidden bg-white rounded-2xl border-2 border-border-dim flex flex-col overflow-hidden text-black ${fontArial}`}
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
                <Person className="w-20 h-20 text-content" />
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
          className={`absolute inset-0 backface-hidden transform-[rotateY(180deg)] bg-white rounded-2xl border-2 border-border-dim flex flex-col p-3 text-black text-[12px] leading-tight overflow-hidden`}
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
              <span className="text-xl -mb-2 text-content-dim italic font-['cursive']!"></span>
              <span className={fontTimes}> </span>
            </div>
            <div className="text-center flex flex-col items-center">
              <span className="text-xl -mb-2 text-content-dim italic font-['cursive']!"></span>
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
      if (useDataStore.getState().status === "Demo Mode Active") {
        setData({
          basic: {
            name: "Demo User",
            regNo: "22ABC1234",
            program: "B.Tech. Computer Science and Engineering",
            school: "School of Computer Science and Engineering",
            email: "demo.user2022@vitstudent.ac.in",
            photoUrl: "",
          },
          personal: {
            appNo: "999999999",
            bloodGroup: "O+ve",
            dob: "01-Jan-2004",
            gender: "Male",
            nationality: "Indian",
            religion: "N/A",
            community: "N/A",
            caste: "N/A",
            nativeLanguage: "English",
            nativeState: "Tamil Nadu",
            physicallyChallenged: "No",
            mobile: "9876543210",
            email: "demo@gmail.com",
            aadhar: "123412341234",
          },
          hostel: {
            appNo: "999999999",
            regNo: "22ABC1234",
            block: "Demo Block",
            room: "101",
            mess: "Special Mess",
            bedType: "4",
          },
          proctor: {
            id: "123",
            name: "Dr. John Doe",
            designation: "Associate Professor",
            school: "SCOPE",
            dept: "Software Systems",
            mobile: "9988776655",
            email: "john.doe@vit.ac.in",
            cabin: "SJT 123",
            photoUrl: "",
          },
          currentAddress: {
            street: "123 Demo Street",
            area: "Demo Area",
            city: "Vellore",
            state: "Tamil Nadu",
            country: "India",
            pincode: "632014",
            phone: "",
          },
          permanentAddress: {
            street: "123 Demo Street",
            area: "Demo Area",
            city: "Vellore",
            state: "Tamil Nadu",
            country: "India",
            pincode: "632014",
            phone: "9876543210",
          },
          education: {
            school: "Demo Public School",
            board: "CBSE",
            medium: "English",
            year: "2022",
            month: "March",
            regNo: "1234567",
            degree: "B.Tech",
            branch: "CSE",
            qualification: "High School",
            classObtained: "First",
            breakInStudy: "No",
            breakReason: "",
            address: { street: "", area: "", city: "Vellore", state: "Tamil Nadu", country: "India", pincode: "632014", phone: "" },
          },
          family: {
            father: {
              name: "Mr. Demo Father",
              designation: "Engineer",
              organization: "Demo Corp",
              qualification: "B.E.",
              occupation: "Private Service",
              income: "N/A",
              mobile: "9999988888",
              email: "father@demo.com",
              address: { street: "", area: "", city: "Vellore", state: "Tamil Nadu", country: "India", pincode: "632014", phone: "" },
            },
            mother: {
              name: "Mrs. Demo Mother",
              designation: "Teacher",
              organization: "Demo School",
              qualification: "M.Sc.",
              occupation: "Teaching",
              income: "N/A",
              mobile: "8888899999",
              email: "mother@demo.com",
              address: { street: "", area: "", city: "Vellore", state: "Tamil Nadu", country: "India", pincode: "632014", phone: "" },
            },
            brothers: "1",
            sisters: "0",
            studyingInVit: "0",
            studiedInVit: "0",
            studyingDetails: "",
            studiedDetails: "",
            guardian: "N/A",
            friendMobile: "9876501234",
          },
        });
        setLoading(false);
        return;
      }

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 grid-flow-dense">

          {/* 1. Digital ID Card (Top Left) */}
          <div className="md:col-span-2 lg:col-span-2 lg:row-span-4 flex justify-start items-center z-10 pl-0 md:pl-4">
            <DigitalIDCard data={data} />
          </div>

          {/* 2. Program & School */}
          <BentoBlock span="md:col-span-2 lg:col-span-2" icon={School}>
             <div className="text-lg md:text-xl font-black leading-tight break-words whitespace-normal text-right">{data.basic.program}</div>
             <div className="opacity-70 text-sm mt-1 break-words whitespace-normal text-right">{data.basic.school}</div>
          </BentoBlock>

          {/* 3. Institutional Email */}
          {isValid(data.basic.email) && (
             <BentoBlock icon={AlternateEmail} span="md:col-span-2 lg:col-span-2">
                <div className="text-xl md:text-2xl font-black leading-tight transition-all duration-fast origin-right w-full py-1 text-wrap wrap-break-word">
                   <CopyableText text={data.basic.email} />
                </div>
             </BentoBlock>
          )}

          {/* 4. Proctor Information */}
          {(isValid(data.proctor.name) || isValid(data.proctor.mobile)) && (
            <div 
               className="relative md:col-span-2 lg:col-span-2 bg-(--bg-surface) text-(--text-main) rounded-4xl transition-all duration-fast flex overflow-hidden min-h-[140px] max-h-max break-words whitespace-normal">
               {data.proctor.photoUrl && (
                  <div className="relative z-10 w-[30%] shrink-0">
                     <img src={data.proctor.photoUrl} className="w-full h-full object-cover transition-all duration-fast" alt="Proctor" />
                  </div>
               )}
               <div className="relative z-10 p-5 md:p-6 flex flex-col justify-between gap-4 flex-1 w-full text-right">
                  <div className="text-[10px] md:text-xs uppercase font-black font-expanded opacity-50 shrink-0 mb-2">Proctor Information</div>
                  <div className="transition-all duration-fast origin-right w-full flex flex-col justify-between text-sm md:text-base font-black font-expanded gap-4">
                     
                     <div className="flex flex-col items-end justify-start gap-1 flex-1 min-w-0">
                        {isValid(data.proctor.name) && <div className="text-xl md:text-2xl leading-tight break-words whitespace-normal">{data.proctor.name}</div>}
                        {isValid(data.proctor.designation) && <div className="opacity-70 mt-1 break-words whitespace-normal">{data.proctor.designation}</div>}
                        {isValid(data.proctor.school) && <div className="opacity-50 text-[10px] md:text-xs mt-1 break-words whitespace-normal">{data.proctor.school} {isValid(data.proctor.dept) && `/ ${data.proctor.dept}`}</div>}
                     </div>

                     <div className="flex flex-col items-end justify-start gap-1 min-w-0 border-t-2 border-zinc-500/20 pt-3 mt-1">
                        {isValid(data.proctor.mobile) && <div className="text-xl md:text-2xl leading-tight"><CopyableText text={data.proctor.mobile} /></div>}
                        {isValid(data.proctor.email) && <div className="opacity-70 normal-case lowercase mt-1 break-words whitespace-normal"><CopyableText text={data.proctor.email} /></div>}
                        {isValid(data.proctor.cabin) && <div className="opacity-50 text-[10px] md:text-xs mt-1 mb-1 break-words whitespace-normal">Cabin: {data.proctor.cabin}</div>}
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* 5. Hostel Details / Day Scholar */}
          {data.hostel ? (
             <BentoBlock icon={Domain} span="md:col-span-2 lg:col-span-4">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-end sm:items-end py-1 w-full text-right">
                   <div className="flex items-end justify-end gap-3 shrink-0">
                      <span className="text-6xl md:text-7xl font-black font-expanded leading-tight break-words whitespace-normal text-right">{data.hostel.room}</span>
                      <span className="text-2xl md:text-3xl opacity-60 pb-1 break-words whitespace-normal text-right">{data.hostel.block}</span>
                   </div>
                   <div className="flex flex-col sm:items-end text-right flex-1 min-w-0">
                      {isValid(data.hostel.mess) && <div className="text-xl md:text-2xl leading-tight text-wrap break-words break-all sm:break-words">{data.hostel.mess}</div>}
                      {isValid(data.hostel.bedType) && <div className="text-sm md:text-base opacity-60 mt-1 uppercase font-black font-expanded text-wrap break-words text-right">{data.hostel.bedType} Bed</div>}
                   </div>
                </div>
             </BentoBlock>
          ) : (
             <BentoBlock icon={Domain} value="Day Scholar" span="md:col-span-2 lg:col-span-4" className="bg-(--bg-highlight)! py-16" />
          )}

          {/* 6. Academic Program */}
          {isValid(data.education.degree) && (
            <BentoBlock title="Academic Program" span="md:col-span-2 lg:col-span-2">
               <div className="text-xl leading-tight break-words whitespace-normal text-right">{data.education.degree} - {data.education.branch}</div>
               <div className="opacity-70 mt-2 break-words whitespace-normal text-right">{data.education.qualification}</div>
               <div className="opacity-50 text-[10px] md:text-xs mt-1 text-right">Class: {data.education.classObtained}</div>
               {data.education.breakInStudy === "Yes" && (
                  <div className="text-att-danger text-[10px] md:text-xs mt-1 text-right">Break: {data.education.breakReason}</div>
               )}
            </BentoBlock>
          )}

          {/* 7. Previous Education */}
          {isValid(data.education.school) && (
            <BentoBlock title="Previous Education" span="md:col-span-2 lg:col-span-2">
               <div className="text-lg md:text-xl leading-tight break-words whitespace-normal text-right">{data.education.school}</div>
               <div className="opacity-70 text-sm mt-2 break-words whitespace-normal text-right">{data.education.board} {isValid(data.education.medium) && `/ Medium: ${data.education.medium}`}</div>
               <div className="opacity-50 text-[10px] md:text-xs mt-1 text-right">Year: {data.education.year} {data.education.month} / Reg: {data.education.regNo}</div>
            </BentoBlock>
          )}

          {/* 8. Blood Group, DOB, Gender */}
          <BentoBlock icon={Bloodtype} value={data.personal.bloodGroup} />
          <BentoBlock icon={Cake} value={data.personal.dob?.replace(/-/g, " ")} />
          <BentoBlock icon={Wc} value={data.personal.gender} />
          
          {/* 9. Background (Nationality, Religion, Community, Language, State) */}
          <BentoBlock icon={Public} span="col-span-1 lg:col-span-1">
             <div className="flex flex-col items-end text-right gap-1 w-full">
                {isValid(data.personal.nationality) && <div>{data.personal.nationality}</div>}
                {isValid(data.personal.nativeLanguage) && <div className="opacity-70 text-sm">{data.personal.nativeLanguage}</div>}
                {isValid(data.personal.religion) && <div className="opacity-50 text-xs">{data.personal.religion}</div>}
             </div>
          </BentoBlock>

          {/* 10. Personal Contact */}
          {(isValid(data.personal.mobile) || isValid(data.personal.email)) && (
            <BentoBlock icon={Mobile} span="md:col-span-2 lg:col-span-2">
               {isValid(data.personal.mobile) && <div className="text-2xl md:text-3xl leading-tight"><CopyableText text={data.personal.mobile} /></div>}
               {isValid(data.personal.email) && <div className="text-sm md:text-base opacity-70 normal-case lowercase mt-1 w-full text-right text-wrap wrap-break-word"><CopyableText text={data.personal.email} /></div>}
            </BentoBlock>
          )}

          {/* 11 & 12. Address */}
          {(isValid(data.currentAddress.street) || isValid(data.permanentAddress.street)) && (
            <BentoBlock icon={LocationOn} span="md:col-span-2 lg:col-span-4">
              <div className="flex flex-col md:flex-row gap-6 w-full text-right justify-end">
                {isValid(data.currentAddress.street) && (
                  <div className="flex flex-col items-end flex-1 text-right break-words whitespace-normal">
                    <div className="opacity-50 text-[10px] md:text-xs mb-1 uppercase font-black font-expanded">Current Address</div>
                    <div className="text-lg md:text-xl leading-tight break-words whitespace-normal">{data.currentAddress.street}</div>
                    <div className="opacity-70 text-sm mt-2 break-words whitespace-normal">{data.currentAddress.area}, {data.currentAddress.city}</div>
                    <div className="opacity-50 text-[10px] md:text-xs mt-1 mb-2 break-words whitespace-normal">{data.currentAddress.state}, {data.currentAddress.country} - {data.currentAddress.pincode}</div>
                    {isValid(data.currentAddress.phone) && <div className="mt-1 text-xl"><CopyableText text={data.currentAddress.phone} /></div>}
                  </div>
                )}
                {isValid(data.permanentAddress.street) && (
                  <div className="flex flex-col items-end flex-1 text-right break-words whitespace-normal">
                    <div className="opacity-50 text-[10px] md:text-xs mb-1 uppercase font-black font-expanded">Permanent Address</div>
                    <div className="text-lg md:text-xl leading-tight break-words whitespace-normal">{data.permanentAddress.street}</div>
                    <div className="opacity-70 text-sm mt-2 break-words whitespace-normal">{data.permanentAddress.area}, {data.permanentAddress.city}</div>
                    <div className="opacity-50 text-[10px] md:text-xs mt-1 mb-2 break-words whitespace-normal">{data.permanentAddress.state}, {data.permanentAddress.country} - {data.permanentAddress.pincode}</div>
                    {isValid(data.permanentAddress.phone) && <div className="mt-1 text-xl"><CopyableText text={data.permanentAddress.phone} /></div>}
                  </div>
                )}
              </div>
            </BentoBlock>
          )}

          {/* 13. Parent Profile */}
          {isValid(data.family.father.name) && (
            <BentoBlock title="Parent" span="md:col-span-2 lg:col-span-2">
               <div className="text-2xl md:text-3xl leading-tight break-words whitespace-normal text-right">{data.family.father.name}</div>
               <div className="opacity-70 text-sm mt-2 break-words whitespace-normal text-right">
                  {[data.family.father.designation, data.family.father.organization].filter(isValid).join(" at ") || "No Work Info"}
               </div>
               <div className="opacity-50 text-[10px] md:text-xs mt-1 break-words whitespace-normal text-right">{data.family.father.qualification} / {data.family.father.occupation} {isValid(data.family.father.income) && `/ Income: ${data.family.father.income}`}</div>
               <div className="mt-4 flex flex-col items-end gap-1 w-full border-t-2 border-zinc-500/20 pt-4">
                 {isValid(data.family.father.mobile) && <div className="text-xl md:text-2xl leading-tight"><CopyableText text={data.family.father.mobile} /></div>}
                 {isValid(data.family.father.email) && <div className="opacity-70 normal-case lowercase mt-1 break-words whitespace-normal text-right"><CopyableText text={data.family.father.email} /></div>}
                 {isValid(data.family.father.address.city) && <div className="opacity-50 text-[10px] md:text-xs mt-1 mb-2 break-words whitespace-normal text-right">{data.family.father.address.city}, {data.family.father.address.state}</div>}
               </div>
            </BentoBlock>
          )}

          {/* 14. Mother Profile */}
          {isValid(data.family.mother.name) && (
            <BentoBlock title="Mother" span="md:col-span-2 lg:col-span-2">
               <div className="text-2xl md:text-3xl leading-tight break-words whitespace-normal text-right">{data.family.mother.name}</div>
               <div className="opacity-70 text-sm mt-2 break-words whitespace-normal text-right">
                  {[data.family.mother.designation, data.family.mother.organization].filter(isValid).join(" at ") || "No Work Info"}
               </div>
               <div className="opacity-50 text-[10px] md:text-xs mt-1 break-words whitespace-normal text-right">{data.family.mother.qualification} / {data.family.mother.occupation} {isValid(data.family.mother.income) && `/ Income: ${data.family.mother.income}`}</div>
               <div className="mt-4 flex flex-col items-end gap-1 w-full border-t-2 border-zinc-500/20 pt-4">
                 {isValid(data.family.mother.mobile) && <div className="text-xl md:text-2xl leading-tight"><CopyableText text={data.family.mother.mobile} /></div>}
                 {isValid(data.family.mother.email) && <div className="opacity-70 normal-case lowercase mt-1 break-words whitespace-normal text-right"><CopyableText text={data.family.mother.email} /></div>}
                 {isValid(data.family.mother.address.city) && <div className="opacity-50 text-[10px] md:text-xs mt-1 mb-2 break-words whitespace-normal text-right">{data.family.mother.address.city}, {data.family.mother.address.state}</div>}
               </div>
            </BentoBlock>
          )}

          {/* 15. Family Extras */}
          <BentoBlock title="Family Extras" span="md:col-span-2 lg:col-span-2">
             <div className="grid grid-cols-2 gap-4 w-full">
                <div className="flex flex-col items-end">
                   <div className="opacity-50 text-[10px] mb-1">Siblings</div>
                   <div className="font-bold text-sm">Brothers: {data.family.brothers}</div>
                   <div className="font-bold text-sm">Sisters: {data.family.sisters}</div>
                </div>
                <div className="flex flex-col items-end">
                   <div className="opacity-50 text-[10px] mb-1">VIT Relations</div>
                   <div className="font-bold text-sm">Studying: {data.family.studyingInVit}</div>
                   <div className="font-bold text-sm">Studied: {data.family.studiedInVit}</div>
                </div>
                <div className="flex flex-col items-end">
                   <div className="opacity-50 text-[10px] mb-1">Local Guardian</div>
                   <div className="font-bold text-sm break-words whitespace-normal text-right">{data.family.guardian}</div>
                </div>
                <div className="flex flex-col items-end">
                   <div className="opacity-50 text-[10px] mb-1">Friend Mobile</div>
                   <div className="font-bold text-sm"><CopyableText text={data.family.friendMobile} /></div>
                </div>
             </div>
          </BentoBlock>

        </div>
      </div>
    </div>
  );
};
