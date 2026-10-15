import React, { useState, useEffect } from "react";
import { VTOPNetwork } from "../utils/network";
import { useDataStore } from "../store/dataStore";
import { getCachedData, setCachedData } from "../utils/cache";
import { parseStudentProfile, resolveProctorPhoto } from "../parsers/profile";
import { StudentProfile } from "../types/vtop";
import { DigitalIDCard } from "../components/profile/DigitalIDCard";
import {
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
  Public,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

const CopyableText = ({
  text,
  children,
  className = "",
}: {
  text: string;
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <span
      className={`cursor-pointer hover:underline decoration-2 underline-offset-4 transition-all ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        window.dispatchEvent(
          new CustomEvent("retop-toast", {
            detail: { message: "Copied!", type: "info" },
          }),
        );
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

const isValid = (val: string | null | undefined) =>
  val &&
  val !== "-" &&
  val.trim() !== "" &&
  val.toUpperCase() !== "N/A" &&
  val.toUpperCase() !== "NA";

const BentoBlock = ({
  title,
  value,
  span = "col-span-1",
  children,
  className = "",
  icon: Icon,
}: any) => {
  if (value !== undefined && !isValid(value)) return null;

  return (
    <div
      className={`relative p-4 sm:p-5 md:p-6 bg-(--bg-surface) text-(--text-main) rounded-3xl sm:rounded-4xl transition-all duration-fast flex flex-col justify-between gap-3 sm:gap-4 overflow-hidden break-words whitespace-normal min-h-28 sm:min-h-35 ${span} ${className}`}
    >
      <div className="relative z-10 flex flex-col justify-between h-full gap-3 sm:gap-4 w-full">
        {Icon ? (
          <div className="flex items-start justify-between w-full h-full gap-3 sm:gap-4">
            <div className="flex flex-col items-start justify-start text-left h-full w-full min-w-0">
              {title && (
                <div className="text-[10px] sm:text-xs uppercase font-black font-expanded opacity-50 shrink-0 mb-1.5 sm:mb-2">
                  {title}
                </div>
              )}
              {value ? (
                <div className="text-xl sm:text-2xl md:text-3xl font-black font-expanded leading-tight w-full break-words whitespace-normal py-0.5 sm:py-1">
                  {value}
                </div>
              ) : (
                <div className="w-full flex flex-col items-start justify-start text-sm md:text-base font-black font-expanded gap-1 break-words whitespace-normal">
                  {children}
                </div>
              )}
            </div>
            <Icon className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-(--text-main) mix-blend-overlay opacity-80 shrink-0" />
          </div>
        ) : (
          <>
            {title && (
              <div className="text-[10px] sm:text-xs uppercase font-black font-expanded opacity-50 shrink-0 mb-1.5 sm:mb-2 text-left w-full">
                {title}
              </div>
            )}
            {value ? (
              <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black font-expanded leading-tight w-full break-words whitespace-normal text-left">
                {value}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col justify-start text-sm md:text-base font-black font-expanded gap-1 break-words whitespace-normal text-left">
                {children}
              </div>
            )}
          </>
        )}
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
            address: {
              street: "",
              area: "",
              city: "Vellore",
              state: "Tamil Nadu",
              country: "India",
              pincode: "632014",
              phone: "",
            },
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
              address: {
                street: "",
                area: "",
                city: "Vellore",
                state: "Tamil Nadu",
                country: "India",
                pincode: "632014",
                phone: "",
              },
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
              address: {
                street: "",
                area: "",
                city: "Vellore",
                state: "Tamil Nadu",
                country: "India",
                pincode: "632014",
                phone: "",
              },
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

      const authId = network.authorizedID || useDataStore.getState().user?.regNo;
      const userPrefix = authId && authId !== "..." ? `${authId}_` : "";

      // 1. Fast restore from cached profile
      const cachedParsed = await getCachedData<StudentProfile>(`${userPrefix}student_profile_parsed`);
      if (cachedParsed?.basic?.name) {
        setData(cachedParsed);
        setLoading(false);
      }

      // 2. Fetch fresh profile data
      try {
        const html = await network.fetchWithCache(
          "student_profile_data",
          async () =>
            await network.fetchFragment("studentsRecord/StudentProfileAllView"),
        );
        const parsedData: StudentProfile = typeof html === "string" ? parseStudentProfile(html) : html;
        if (parsedData?.basic) {
          const storeUser = useDataStore.getState().user;
          if (!parsedData.basic.name && storeUser?.name && storeUser.name !== "Student") {
            parsedData.basic.name = storeUser.name;
          }
          if (!parsedData.basic.regNo && (authId || storeUser?.regNo)) {
            parsedData.basic.regNo = authId || storeUser?.regNo || "";
          }
          if (!parsedData.basic.photoUrl && storeUser?.profileImgBase64) {
            parsedData.basic.photoUrl = storeUser.profileImgBase64;
          }

          setData(parsedData);
          setCachedData(`${userPrefix}student_profile_parsed`, parsedData);

          // The parser drops VTOP's student-photo fallback, so the real faculty
          // image has to be downloaded separately. Paint first, then swap it in.
          resolveProctorPhoto(parsedData)
            .then((withPhoto) => {
              if (withPhoto.proctor?.photoUrl === parsedData.proctor?.photoUrl) return;
              setData(withPhoto);
              setCachedData(`${userPrefix}student_profile_parsed`, withPhoto);
            })
            .catch(() => {});
        }
      } catch (e) {
        console.error("Failed to load profile data:", e);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    const handleRefresh = async () => {
      setLoading(true);
      const authId = network.authorizedID || useDataStore.getState().user?.regNo;
      const userPrefix = authId && authId !== "..." ? `${authId}_` : "";
      try {
        const html = await network.fetchWithCache(
          "student_profile_data",
          async () => await network.fetchFragment("studentsRecord/StudentProfileAllView"),
          true,
        );
        const parsedData: StudentProfile = typeof html === "string" ? parseStudentProfile(html) : html;
        if (parsedData?.basic) {
          const storeUser = useDataStore.getState().user;
          if (!parsedData.basic.name && storeUser?.name && storeUser.name !== "Student") {
            parsedData.basic.name = storeUser.name;
          }
          if (!parsedData.basic.regNo && (authId || storeUser?.regNo)) {
            parsedData.basic.regNo = authId || storeUser?.regNo || "";
          }
          if (!parsedData.basic.photoUrl && storeUser?.profileImgBase64) {
            parsedData.basic.photoUrl = storeUser.profileImgBase64;
          }

          setData(parsedData);
          setCachedData(`${userPrefix}student_profile_parsed`, parsedData);

          resolveProctorPhoto(parsedData)
            .then((withPhoto) => {
              if (withPhoto.proctor?.photoUrl === parsedData.proctor?.photoUrl) return;
              setData(withPhoto);
              setCachedData(`${userPrefix}student_profile_parsed`, withPhoto);
            })
            .catch(() => {});
        }
      } catch (e) {
        console.error("Failed to refresh profile:", e);
      } finally {
        setLoading(false);
      }
    };
    window.addEventListener("retop-refresh-profile", handleRefresh);
    return () => window.removeEventListener("retop-refresh-profile", handleRefresh);
  }, [network]);

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-(--bg-main) p-3 sm:p-4 md:p-8 pt-18 sm:pt-20 md:pt-24 lg:pt-28 custom-scrollbar">
        <div className="max-w-345 mx-auto flex flex-col gap-8 sm:gap-12 md:gap-20 animate-pulse pb-20 w-full">
          <div className="w-full max-w-74 mx-auto aspect-64/100 bg-(--bg-surface) rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="md:col-span-2 h-36 bg-(--bg-surface) rounded-3xl" />
            <div className="md:col-span-2 h-36 bg-(--bg-surface) rounded-3xl" />
            <div className="md:col-span-2 h-36 bg-(--bg-surface) rounded-3xl" />
            <div className="col-span-1 h-36 bg-(--bg-surface) rounded-3xl" />
            <div className="col-span-1 h-36 bg-(--bg-surface) rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full w-full overflow-y-auto bg-(--bg-main) p-3 sm:p-4 md:p-8 pt-18 sm:pt-20 md:pt-24 lg:pt-28 font-mono custom-scrollbar">
      <div className="max-w-345 mx-auto flex flex-col pb-20 w-full">
        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 grid-flow-dense w-full">
          {/* 1. Digital ID Card (Top Left) */}
          <div className="md:col-span-2 lg:col-span-2 lg:row-span-4 flex justify-center items-center z-10 w-full py-1 sm:py-2">
            <DigitalIDCard data={data} />
          </div>

          {/* 2. Program & School */}
          <BentoBlock span="md:col-span-2 lg:col-span-2" icon={School}>
            <div className="text-base sm:text-lg md:text-xl font-black leading-tight break-words whitespace-normal text-left">
              {data.basic.program}
            </div>
            <div className="opacity-70 text-xs sm:text-sm mt-1 break-words whitespace-normal text-left">
              {data.basic.school}
            </div>
          </BentoBlock>

          {/* 3. Institutional Email */}
          {isValid(data.basic.email) && (
            <BentoBlock
              icon={AlternateEmail}
              span="md:col-span-2 lg:col-span-2"
            >
              <div className="text-lg sm:text-xl md:text-2xl font-black leading-tight transition-all duration-fast origin-left w-full py-0.5 sm:py-1 break-words text-left">
                <CopyableText text={data.basic.email} />
              </div>
            </BentoBlock>
          )}

          {/* 4. Proctor Information */}
          {(isValid(data.proctor.name) || isValid(data.proctor.mobile)) && (
            <div className="relative md:col-span-2 lg:col-span-2 bg-(--bg-surface) text-(--text-main) rounded-3xl sm:rounded-4xl transition-all duration-fast flex flex-col sm:flex-row overflow-hidden min-h-30 sm:min-h-35 max-h-max break-words whitespace-normal">
              {data.proctor.photoUrl && (
                <div className="relative z-10 w-full sm:w-[32%] h-44 sm:h-auto shrink-0 bg-(--bg-surface-dim)">
                  <img
                    src={data.proctor.photoUrl}
                    className="w-full h-full object-cover transition-all duration-fast"
                    alt="Proctor"
                  />
                </div>
              )}
              <div className="relative z-10 p-4 sm:p-5 md:p-6 flex flex-col justify-between gap-3 sm:gap-4 flex-1 w-full text-left">
                <div className="text-[10px] sm:text-xs uppercase font-black font-expanded opacity-50 shrink-0 mb-1 sm:mb-2">
                  Proctor Information
                </div>
                <div className="transition-all duration-fast origin-left w-full flex flex-col justify-between text-sm md:text-base font-black font-expanded gap-3 sm:gap-4">
                  <div className="flex flex-col items-start justify-start gap-1 flex-1 min-w-0">
                    {isValid(data.proctor.name) && (
                      <div className="text-lg sm:text-xl md:text-2xl leading-tight break-words whitespace-normal">
                        {data.proctor.name}
                      </div>
                    )}
                    {isValid(data.proctor.designation) && (
                      <div className="opacity-70 mt-1 break-words whitespace-normal text-xs sm:text-sm">
                        {data.proctor.designation}
                      </div>
                    )}
                    {isValid(data.proctor.school) && (
                      <div className="opacity-50 text-[10px] sm:text-xs mt-1 break-words whitespace-normal">
                        {data.proctor.school}{" "}
                        {isValid(data.proctor.dept) && `/ ${data.proctor.dept}`}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-start justify-start gap-1 min-w-0 border-t-2 border-zinc-500/20 pt-3 mt-1">
                    {isValid(data.proctor.mobile) && (
                      <div className="text-lg sm:text-xl md:text-2xl leading-tight">
                        <CopyableText text={data.proctor.mobile} />
                      </div>
                    )}
                    {isValid(data.proctor.email) && (
                      <div className="opacity-70 lowercase mt-1 break-words whitespace-normal text-xs sm:text-sm">
                        <CopyableText text={data.proctor.email} />
                      </div>
                    )}
                    {isValid(data.proctor.cabin) && (
                      <div className="opacity-50 text-[10px] sm:text-xs mt-1 mb-1 break-words whitespace-normal">
                        Cabin: {data.proctor.cabin}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. Hostel Details / Day Scholar */}
          {data.hostel ? (
            <BentoBlock icon={Domain} span="md:col-span-2 lg:col-span-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-start sm:items-start py-1 w-full text-left">
                <div className="flex items-start justify-start gap-3 shrink-0">
                  <span className="text-4xl sm:text-6xl md:text-7xl font-black font-expanded leading-tight break-words whitespace-normal text-left">
                    {data.hostel.room}
                  </span>
                  <span className="text-xl sm:text-2xl md:text-3xl opacity-60 pb-1 break-words whitespace-normal text-left">
                    {data.hostel.block}
                  </span>
                </div>
                <div className="flex flex-col sm:items-start text-left flex-1 min-w-0">
                  {isValid(data.hostel.mess) && (
                    <div className="text-lg sm:text-xl md:text-2xl leading-tight break-words">
                      {data.hostel.mess}
                    </div>
                  )}
                  {isValid(data.hostel.bedType) && (
                    <div className="text-xs sm:text-sm md:text-base opacity-60 mt-1 uppercase font-black font-expanded break-words text-left">
                      {data.hostel.bedType} Bed
                    </div>
                  )}
                </div>
              </div>
            </BentoBlock>
          ) : (
            <BentoBlock
              icon={Domain}
              value="Day Scholar"
              span="md:col-span-2 lg:col-span-4"
              className="bg-(--bg-highlight)! py-10 sm:py-16"
            />
          )}

          {/* 6. Academic Program */}
          {isValid(data.education.degree) && (
            <BentoBlock
              title="Academic Program"
              span="md:col-span-2 lg:col-span-2"
            >
              <div className="text-lg sm:text-xl leading-tight break-words whitespace-normal text-left">
                {data.education.degree} - {data.education.branch}
              </div>
              <div className="opacity-70 mt-1.5 break-words whitespace-normal text-left text-xs sm:text-sm">
                {data.education.qualification}
              </div>
              <div className="opacity-50 text-[10px] sm:text-xs mt-1 text-left">
                Class: {data.education.classObtained}
              </div>
              {data.education.breakInStudy === "Yes" && (
                <div className="text-att-danger text-[10px] sm:text-xs mt-1 text-left">
                  Break: {data.education.breakReason}
                </div>
              )}
            </BentoBlock>
          )}

          {/* 7. Previous Education */}
          {isValid(data.education.school) && (
            <BentoBlock
              title="Previous Education"
              span="md:col-span-2 lg:col-span-2"
            >
              <div className="text-base sm:text-lg md:text-xl leading-tight break-words whitespace-normal text-left">
                {data.education.school}
              </div>
              <div className="opacity-70 text-xs sm:text-sm mt-1.5 break-words whitespace-normal text-left">
                {data.education.board}{" "}
                {isValid(data.education.medium) &&
                  `/ Medium: ${data.education.medium}`}
              </div>
              <div className="opacity-50 text-[10px] sm:text-xs mt-1 text-left">
                Year: {data.education.year} {data.education.month} / Reg:{" "}
                {data.education.regNo}
              </div>
            </BentoBlock>
          )}

          {/* 8. Blood Group, DOB, Gender */}
          <BentoBlock icon={Bloodtype} value={data.personal.bloodGroup} />
          <BentoBlock
            icon={Cake}
            value={data.personal.dob?.replace(/-/g, " ")}
          />
          <BentoBlock icon={Wc} value={data.personal.gender} />

          {/* 9. Background (Nationality, Religion, Community, Language, State) */}
          <BentoBlock icon={Public} span="col-span-1 lg:col-span-1">
            <div className="flex flex-col items-start text-left gap-1 w-full">
              {isValid(data.personal.nationality) && (
                <div className="text-sm sm:text-base font-bold">{data.personal.nationality}</div>
              )}
              {isValid(data.personal.nativeLanguage) && (
                <div className="opacity-70 text-xs sm:text-sm">
                  {data.personal.nativeLanguage}
                </div>
              )}
              {isValid(data.personal.religion) && (
                <div className="opacity-50 text-[10px] sm:text-xs">
                  {data.personal.religion}
                </div>
              )}
            </div>
          </BentoBlock>

          {/* 10. Personal Contact */}
          {(isValid(data.personal.mobile) || isValid(data.personal.email)) && (
            <BentoBlock icon={Mobile} span="md:col-span-2 lg:col-span-2">
              {isValid(data.personal.mobile) && (
                <div className="text-xl sm:text-2xl md:text-3xl leading-tight">
                  <CopyableText text={data.personal.mobile} />
                </div>
              )}
              {isValid(data.personal.email) && (
                <div className="text-xs sm:text-sm md:text-base opacity-70 lowercase mt-1 w-full text-left break-words">
                  <CopyableText text={data.personal.email} />
                </div>
              )}
            </BentoBlock>
          )}

          {/* 11 & 12. Address */}
          {(isValid(data.currentAddress.street) ||
            isValid(data.permanentAddress.street)) && (
            <BentoBlock icon={LocationOn} span="md:col-span-2 lg:col-span-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full text-left justify-start">
                {isValid(data.currentAddress.street) && (
                  <div className="flex flex-col items-start flex-1 text-left break-words whitespace-normal">
                    <div className="opacity-50 text-[10px] sm:text-xs mb-1 uppercase font-black font-expanded">
                      Current Address
                    </div>
                    <div className="text-base sm:text-lg md:text-xl leading-tight break-words whitespace-normal">
                      {data.currentAddress.street}
                    </div>
                    <div className="opacity-70 text-xs sm:text-sm mt-1.5 break-words whitespace-normal">
                      {data.currentAddress.area}, {data.currentAddress.city}
                    </div>
                    <div className="opacity-50 text-[10px] sm:text-xs mt-1 mb-1 break-words whitespace-normal">
                      {data.currentAddress.state}, {data.currentAddress.country}{" "}
                      - {data.currentAddress.pincode}
                    </div>
                    {isValid(data.currentAddress.phone) && (
                      <div className="mt-1 text-base sm:text-lg">
                        <CopyableText text={data.currentAddress.phone} />
                      </div>
                    )}
                  </div>
                )}
                {isValid(data.permanentAddress.street) && (
                  <div className="flex flex-col items-start flex-1 text-left break-words whitespace-normal">
                    <div className="opacity-50 text-[10px] sm:text-xs mb-1 uppercase font-black font-expanded">
                      Permanent Address
                    </div>
                    <div className="text-base sm:text-lg md:text-xl leading-tight break-words whitespace-normal">
                      {data.permanentAddress.street}
                    </div>
                    <div className="opacity-70 text-xs sm:text-sm mt-1.5 break-words whitespace-normal">
                      {data.permanentAddress.area}, {data.permanentAddress.city}
                    </div>
                    <div className="opacity-50 text-[10px] sm:text-xs mt-1 mb-1 break-words whitespace-normal">
                      {data.permanentAddress.state},{" "}
                      {data.permanentAddress.country} -{" "}
                      {data.permanentAddress.pincode}
                    </div>
                    {isValid(data.permanentAddress.phone) && (
                      <div className="mt-1 text-base sm:text-lg">
                        <CopyableText text={data.permanentAddress.phone} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </BentoBlock>
          )}

          {/* 13. Parent Profile */}
          {isValid(data.family.father.name) && (
            <BentoBlock title="Parent" span="md:col-span-2 lg:col-span-2">
              <div className="text-xl sm:text-2xl md:text-3xl leading-tight break-words whitespace-normal text-left">
                {data.family.father.name}
              </div>
              <div className="opacity-70 text-xs sm:text-sm mt-1.5 break-words whitespace-normal text-left">
                {[
                  data.family.father.designation,
                  data.family.father.organization,
                ]
                  .filter(isValid)
                  .join(" at ") || "No Work Info"}
              </div>
              <div className="opacity-50 text-[10px] sm:text-xs mt-1 break-words whitespace-normal text-left">
                {data.family.father.qualification} /{" "}
                {data.family.father.occupation}{" "}
                {isValid(data.family.father.income) &&
                  `/ Income: ${data.family.father.income}`}
              </div>
              <div className="mt-3 sm:mt-4 flex flex-col items-start gap-1 w-full border-t-2 border-zinc-500/20 pt-3 sm:pt-4">
                {isValid(data.family.father.mobile) && (
                  <div className="text-lg sm:text-xl md:text-2xl leading-tight">
                    <CopyableText text={data.family.father.mobile} />
                  </div>
                )}
                {isValid(data.family.father.email) && (
                  <div className="opacity-70 lowercase mt-1 break-words whitespace-normal text-left text-xs sm:text-sm">
                    <CopyableText text={data.family.father.email} />
                  </div>
                )}
                {isValid(data.family.father.address.city) && (
                  <div className="opacity-50 text-[10px] sm:text-xs mt-1 mb-1 break-words whitespace-normal text-left">
                    {data.family.father.address.city},{" "}
                    {data.family.father.address.state}
                  </div>
                )}
              </div>
            </BentoBlock>
          )}

          {/* 14. Mother Profile */}
          {isValid(data.family.mother.name) && (
            <BentoBlock title="Mother" span="md:col-span-2 lg:col-span-2">
              <div className="text-xl sm:text-2xl md:text-3xl leading-tight break-words whitespace-normal text-left">
                {data.family.mother.name}
              </div>
              <div className="opacity-70 text-xs sm:text-sm mt-1.5 break-words whitespace-normal text-left">
                {[
                  data.family.mother.designation,
                  data.family.mother.organization,
                ]
                  .filter(isValid)
                  .join(" at ") || "No Work Info"}
              </div>
              <div className="opacity-50 text-[10px] sm:text-xs mt-1 break-words whitespace-normal text-left">
                {data.family.mother.qualification} /{" "}
                {data.family.mother.occupation}{" "}
                {isValid(data.family.mother.income) &&
                  `/ Income: ${data.family.mother.income}`}
              </div>
              <div className="mt-3 sm:mt-4 flex flex-col items-start gap-1 w-full border-t-2 border-zinc-500/20 pt-3 sm:pt-4">
                {isValid(data.family.mother.mobile) && (
                  <div className="text-lg sm:text-xl md:text-2xl leading-tight">
                    <CopyableText text={data.family.mother.mobile} />
                  </div>
                )}
                {isValid(data.family.mother.email) && (
                  <div className="opacity-70 lowercase mt-1 break-words whitespace-normal text-left text-xs sm:text-sm">
                    <CopyableText text={data.family.mother.email} />
                  </div>
                )}
                {isValid(data.family.mother.address.city) && (
                  <div className="opacity-50 text-[10px] sm:text-xs mt-1 mb-1 break-words whitespace-normal text-left">
                    {data.family.mother.address.city},{" "}
                    {data.family.mother.address.state}
                  </div>
                )}
              </div>
            </BentoBlock>
          )}

          {/* 15. Family Extras */}
          <BentoBlock title="Family Extras" span="md:col-span-2 lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
              <div className="flex flex-col items-start">
                <div className="opacity-50 text-[10px] mb-1">Siblings</div>
                <div className="font-bold text-xs sm:text-sm">
                  Brothers: {data.family.brothers}
                </div>
                <div className="font-bold text-xs sm:text-sm">
                  Sisters: {data.family.sisters}
                </div>
              </div>
              <div className="flex flex-col items-start">
                <div className="opacity-50 text-[10px] mb-1">VIT Relations</div>
                <div className="font-bold text-xs sm:text-sm">
                  Studying: {data.family.studyingInVit}
                </div>
                <div className="font-bold text-xs sm:text-sm">
                  Studied: {data.family.studiedInVit}
                </div>
              </div>
              <div className="flex flex-col items-start">
                <div className="opacity-50 text-[10px] mb-1">
                  Local Guardian
                </div>
                <div className="font-bold text-xs sm:text-sm break-words whitespace-normal text-left">
                  {data.family.guardian}
                </div>
              </div>
              <div className="flex flex-col items-start">
                <div className="opacity-50 text-[10px] mb-1">Friend Mobile</div>
                <div className="font-bold text-xs sm:text-sm">
                  <CopyableText text={data.family.friendMobile} />
                </div>
              </div>
            </div>
          </BentoBlock>
        </div>
      </div>
    </div>
  );
};
