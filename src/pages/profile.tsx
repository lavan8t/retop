import React, { useState, useEffect } from "react";
import { VTOPNetwork } from "../utils/network";
import { useDataStore } from "../store/dataStore";
import { getCachedData, setCachedData } from "../utils/cache";
import { parseStudentProfile, resolveProctorPhoto } from "../parsers/profile";
import { StudentProfile } from "../types/vtop";
import { DigitalIDCard } from "../components/profile/DigitalIDCard";
import { CopyableText } from "../components/profile/CopyableText";
import { Person } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import {
  formatBedType,
  formatHostelBlock,
  formatHostelRoom,
  formatMessDetails,
} from "../utils/hostelFormat";

interface ProfilePageProps {
  network: VTOPNetwork;
}

const isValid = (val: string | null | undefined): val is string =>
  !!val &&
  val !== "-" &&
  val.trim() !== "" &&
  val.toUpperCase() !== "N/A" &&
  val.toUpperCase() !== "NA";

/** Same grouped-list geometry as the app: 18px on the outside, 4px inside. */
const groupedShape = (index: number, total: number): string => {
  if (total <= 1) return "rounded-[18px]";
  if (index === 0) return "rounded-t-[18px] rounded-b-[4px]";
  if (index === total - 1) return "rounded-t-[4px] rounded-b-[18px]";
  return "rounded-[4px]";
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="mt-4 pl-1.5 text-xs font-bold text-(--accent-base)">{title}</h2>
    <div className="mt-1 flex flex-col gap-0.5">{children}</div>
  </section>
);

/**
 * Loading placeholder that mirrors the real layout: the ID card plus the
 * grouped-list sections, in the same two columns the page uses.
 */
const SkeletonSection = ({ title, rows }: { title: string; rows: number }) => (
  <section>
    <div className="mt-4 h-3 w-28 rounded bg-(--accent-base)/30" />
    <div className="mt-1 flex flex-col gap-0.5">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={`h-18 bg-(--bg-surface) ${groupedShape(index, rows)}`}
        />
      ))}
    </div>
  </section>
);

interface RowItem {
  label: string;
  value: string;
  subtitle?: string;
  badge?: string;
  copy?: string;
}

const ListRow = ({
  label,
  value,
  subtitle,
  badge,
  copy,
  shape,
}: RowItem & { shape: string }) => (
  <div className={`bg-(--bg-surface) px-4 py-3 ${shape}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1 whitespace-pre-line break-words text-[15px] font-bold leading-snug text-(--text-main)">
        {copy ? <CopyableText text={copy}>{value}</CopyableText> : value}
      </div>
      {isValid(badge) && (
        <span className="shrink-0 rounded-full bg-(--bg-highlight) px-2 py-0.5 text-[11px] font-bold text-(--accent-base)">
          {badge}
        </span>
      )}
    </div>
    {isValid(subtitle) && (
      <div className="mt-0.5 whitespace-pre-line break-words text-xs leading-snug opacity-70">
        {subtitle}
      </div>
    )}
    <div className="mt-1 text-[11px] font-medium opacity-50">{label}</div>
  </div>
);

const ListRows = ({ items }: { items: RowItem[] }) =>
  items.map((item, index) => (
    <ListRow key={item.label} {...item} shape={groupedShape(index, items.length)} />
  ));

const ProctorCard = ({
  data,
  shape,
}: {
  data: StudentProfile["proctor"];
  shape: string;
}) => (
  <div className={`flex min-h-27 overflow-hidden bg-(--bg-surface) ${shape}`}>
    <div className="relative w-27 shrink-0 self-stretch bg-(--bg-highlight)">
      {isValid(data.photoUrl) ? (
        <img
          src={data.photoUrl}
          alt={data.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <Person className="absolute inset-0 m-auto h-10 w-10 opacity-40" />
      )}
    </div>
    <div className="min-w-0 flex-1 px-3.5 py-3">
      <div className="break-words text-base font-bold leading-snug">
        {isValid(data.name) ? data.name : "Proctor"}
      </div>
      {isValid(data.designation) && (
        <div className="mt-0.5 break-words text-xs font-medium leading-snug opacity-70">
          {data.designation}
        </div>
      )}
      {(isValid(data.school) || isValid(data.dept)) && (
        <div className="mt-0.5 whitespace-pre-line break-words text-[11px] leading-snug opacity-60">
          {[data.school, data.dept].filter(isValid).join("\n")}
        </div>
      )}
    </div>
  </div>
);

const AddressRow = ({
  title,
  lines,
  phone,
  shape,
}: {
  title: string;
  lines: string[];
  phone?: string;
  shape: string;
}) => (
  <div className={`bg-(--bg-surface) px-4 py-3 ${shape}`}>
    <div className="space-y-0.5 text-[15px] font-bold leading-snug">
      {lines.map((line, index) => (
        <div key={index} className="break-words">
          {line}
        </div>
      ))}
    </div>
    {isValid(phone) && (
      <div className="mt-1 text-xs opacity-70">
        <CopyableText text={phone}>Phone: {phone}</CopyableText>
      </div>
    )}
    <div className="mt-1 text-[11px] font-medium opacity-50">{title}</div>
  </div>
);

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
      <div className="h-full w-full overflow-y-auto bg-(--bg-main) p-4 pt-18 font-mono custom-scrollbar sm:pt-20 md:pt-24 lg:pt-28">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 animate-pulse items-start gap-x-6 pb-24 lg:grid-cols-2">
          <div className="flex flex-col">
            <div className="flex justify-center">
              <div className="aspect-64/100 w-full max-w-74 rounded-2xl bg-(--bg-surface)" />
            </div>

            <SkeletonSection title="Proctor Details" rows={3} />
            <SkeletonSection title="Academic Program" rows={4} />
            <SkeletonSection title="Residence" rows={4} />
          </div>

          <div className="flex flex-col">
            <SkeletonSection title="Contact Information" rows={2} />
            <SkeletonSection title="Personal Details" rows={6} />
            <SkeletonSection title="Addresses" rows={2} />
            <SkeletonSection title="Education History" rows={1} />
            <SkeletonSection title="Family Details" rows={3} />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const proctorContacts: RowItem[] = [];
  if (isValid(data.proctor.mobile)) {
    proctorContacts.push({
      label: "Proctor Mobile",
      value: data.proctor.mobile,
      copy: data.proctor.mobile,
    });
  }
  if (isValid(data.proctor.email)) {
    proctorContacts.push({
      label: "Proctor Email",
      value: data.proctor.email.toLowerCase(),
      copy: data.proctor.email,
    });
  }
  if (isValid(data.proctor.cabin)) {
    proctorContacts.push({ label: "Proctor Cabin", value: data.proctor.cabin });
  }

  const academicItems: RowItem[] = [];
  const program = isValid(data.education.degree) ? data.education.degree : data.basic.program;
  if (isValid(program)) {
    academicItems.push({
      label: "Program & Degree",
      value: program,
      subtitle: isValid(data.basic.school) ? data.basic.school : undefined,
    });
  }
  if (isValid(data.basic.regNo)) {
    academicItems.push({ label: "Registration Number", value: data.basic.regNo });
  }
  if (isValid(data.personal.appNo)) {
    academicItems.push({ label: "Application Number", value: data.personal.appNo });
  }
  if (isValid(data.education.branch)) {
    academicItems.push({ label: "Branch", value: data.education.branch });
  }

  const residenceItems: RowItem[] = [];
  if (data.hostel) {
    const block = formatHostelBlock(data.hostel.block);
    const room = formatHostelRoom(data.hostel.room);
    const bed = formatBedType(data.hostel.bedType);
    const mess = formatMessDetails(data.hostel.mess);
    if (isValid(block.displayName)) {
      residenceItems.push({
        label: "Hostel Block",
        value: block.displayName,
        badge: block.badge,
      });
    }
    if (isValid(room)) {
      residenceItems.push({ label: "Room Number", value: room });
    }
    if (isValid(bed)) {
      residenceItems.push({ label: "Bed Type", value: bed });
    }
    if (isValid(mess.messType)) {
      residenceItems.push({
        label: "Mess Facility",
        value: mess.messType,
        subtitle: mess.caterer,
      });
    }
  } else {
    residenceItems.push({
      label: "Residence",
      value: "Day Scholar",
      subtitle: "Off-Campus Student",
    });
  }

  const contactItems: RowItem[] = [];
  const institutionalEmail = isValid(data.basic.email) ? data.basic.email : data.personal.email;
  if (isValid(institutionalEmail)) {
    contactItems.push({
      label: "Institutional Email",
      value: institutionalEmail.toLowerCase(),
      copy: institutionalEmail,
    });
  }
  if (isValid(data.personal.mobile)) {
    contactItems.push({
      label: "Student Mobile",
      value: data.personal.mobile,
      copy: data.personal.mobile,
    });
  }

  const personalItems: RowItem[] = [];
  if (isValid(data.personal.dob)) {
    personalItems.push({ label: "Date of Birth", value: data.personal.dob.replace(/-/g, " ") });
  }
  if (isValid(data.personal.gender)) {
    personalItems.push({ label: "Gender", value: data.personal.gender });
  }
  if (isValid(data.personal.bloodGroup)) {
    personalItems.push({ label: "Blood Group", value: data.personal.bloodGroup });
  }
  if (isValid(data.personal.nativeLanguage)) {
    personalItems.push({ label: "Native Language", value: data.personal.nativeLanguage });
  }
  if (isValid(data.personal.nativeState)) {
    personalItems.push({ label: "Native State", value: data.personal.nativeState });
  }
  if (isValid(data.personal.nationality)) {
    personalItems.push({ label: "Nationality", value: data.personal.nationality });
  }
  const religionCommunity = [data.personal.religion, data.personal.community]
    .filter(isValid)
    .join(" / ");
  if (isValid(religionCommunity)) {
    personalItems.push({ label: "Religion / Community", value: religionCommunity });
  }

  const addressItem = (title: string, address: StudentProfile["currentAddress"]) => {
    const areaCity = [address.area, address.city].filter(isValid).join(", ");
    const stateCountry = [address.state, address.country].filter(isValid).join(", ");
    const statePin = [stateCountry, address.pincode].filter(isValid).join(" - ");
    const lines = [address.street, areaCity, statePin].filter(isValid);
    return lines.length > 0 ? { title, lines, phone: address.phone } : null;
  };
  const addressItems = [
    addressItem("Current Address", data.currentAddress),
    addressItem("Permanent Address", data.permanentAddress),
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  const educationItems: RowItem[] = [];
  if (isValid(data.education.school)) {
    const boardMedium = [
      isValid(data.education.board) ? `Board: ${data.education.board}` : "",
      isValid(data.education.medium) ? `Medium: ${data.education.medium}` : "",
    ]
      .filter(isValid)
      .join(" · ");
    const year = [data.education.year, data.education.month].filter(isValid).join(" ");
    const yearReg = [
      isValid(year) ? `Year: ${year}` : "",
      isValid(data.education.regNo) ? `Reg: ${data.education.regNo}` : "",
    ]
      .filter(isValid)
      .join(" · ");
    educationItems.push({
      label: "Previous Education",
      value: data.education.school,
      subtitle: [boardMedium, yearReg].filter(isValid).join("\n") || undefined,
    });
  }

  const familyItems: RowItem[] = [];
  const parentSubtitle = (parent: StudentProfile["family"]["father"]) =>
    [
      [parent.designation, parent.organization].filter(isValid).join(" at "),
      [
        parent.qualification,
        parent.occupation,
        isValid(parent.income) ? `Income: ${parent.income}` : "",
      ]
        .filter(isValid)
        .join(" / "),
    ]
      .filter(isValid)
      .join("\n") || undefined;

  if (isValid(data.family.father.name)) {
    familyItems.push({
      label: "Father",
      value: data.family.father.name,
      subtitle: parentSubtitle(data.family.father),
    });
    if (isValid(data.family.father.mobile)) {
      familyItems.push({
        label: "Father Mobile",
        value: data.family.father.mobile,
        copy: data.family.father.mobile,
      });
    }
    if (isValid(data.family.father.email)) {
      familyItems.push({
        label: "Father Email",
        value: data.family.father.email.toLowerCase(),
        copy: data.family.father.email,
      });
    }
  }
  if (isValid(data.family.mother.name)) {
    familyItems.push({
      label: "Mother",
      value: data.family.mother.name,
      subtitle: parentSubtitle(data.family.mother),
    });
    if (isValid(data.family.mother.mobile)) {
      familyItems.push({
        label: "Mother Mobile",
        value: data.family.mother.mobile,
        copy: data.family.mother.mobile,
      });
    }
    if (isValid(data.family.mother.email)) {
      familyItems.push({
        label: "Mother Email",
        value: data.family.mother.email.toLowerCase(),
        copy: data.family.mother.email,
      });
    }
  }
  if (isValid(data.family.guardian) && data.family.guardian.toUpperCase() !== "PARENT") {
    familyItems.push({ label: "Local Guardian", value: data.family.guardian });
  }
  if (isValid(data.family.brothers) || isValid(data.family.sisters)) {
    familyItems.push({
      label: "Siblings",
      value: `Brothers: ${data.family.brothers || "0"}\nSisters: ${data.family.sisters || "0"}`,
    });
  }
  const familyIncome = [data.family.father.income, data.family.mother.income].find(isValid);
  if (familyIncome) {
    familyItems.push({ label: "Annual Income", value: familyIncome });
  }
  if (isValid(data.family.friendMobile)) {
    familyItems.push({
      label: "Emergency / Friend Mobile",
      value: data.family.friendMobile,
      copy: data.family.friendMobile,
    });
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-(--bg-main) p-4 pt-18 font-mono custom-scrollbar sm:pt-20 md:pt-24 lg:pt-28">
      {/* Two columns on wide screens. The source order is left column then
          right column, so the stacked order on mobile is unchanged. */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-x-6 pb-24 lg:grid-cols-2">
        <div className="flex flex-col">
          <div className="flex justify-center">
            <DigitalIDCard data={data} />
          </div>

          {(isValid(data.proctor.name) ||
            isValid(data.proctor.mobile) ||
            isValid(data.proctor.email)) && (
            <Section title="Proctor Details">
              <ProctorCard data={data.proctor} shape={groupedShape(0, 1 + proctorContacts.length)} />
              {proctorContacts.map((item, index) => (
                <ListRow
                  key={item.label}
                  {...item}
                  shape={groupedShape(index + 1, 1 + proctorContacts.length)}
                />
              ))}
            </Section>
          )}

          {academicItems.length > 0 && (
            <Section title="Academic Program">
              <ListRows items={academicItems} />
            </Section>
          )}

          <Section title="Residence">
            <ListRows items={residenceItems} />
          </Section>
        </div>

        <div className="flex flex-col">
          {contactItems.length > 0 && (
            <Section title="Contact Information">
              <ListRows items={contactItems} />
            </Section>
          )}

          {personalItems.length > 0 && (
            <Section title="Personal Details">
              <ListRows items={personalItems} />
            </Section>
          )}

          {addressItems.length > 0 && (
            <Section title="Addresses">
              {addressItems.map((item, index) => (
                <AddressRow
                  key={item.title}
                  {...item}
                  shape={groupedShape(index, addressItems.length)}
                />
              ))}
            </Section>
          )}

          {educationItems.length > 0 && (
            <Section title="Education History">
              <ListRows items={educationItems} />
            </Section>
          )}

          {familyItems.length > 0 && (
            <Section title="Family Details">
              <ListRows items={familyItems} />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
};
