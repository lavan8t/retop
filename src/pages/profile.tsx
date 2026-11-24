import React, { useState, useEffect } from 'react';
import { VTOPNetwork } from '../utils/network';
import { useDataStore } from '../store/dataStore';
import { getCachedData, setCachedData } from '../utils/cache';
import { parseStudentProfile, resolveProctorPhoto } from '../parsers/profile';
import { getUserProfileImage } from '../utils/pinSecurity';
import { StudentProfile } from '../types/vtop';
import { CopyableText } from '../components/profile/CopyableText';
import {
  AccountBalance,
  Bloodtype,
  CalendarMonth,
  Call,
  DirectionsBus,
  DiversityThree,
  Flag,
  Groups,
  Home,
  KingBed,
  LocationOn,
  Mail,
  MeetingRoom,
  MenuBook,
  Payments,
  Person,
  Restaurant,
  School,
  TranslateIndic,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import {
  formatBedType,
  formatHostelBlock,
  formatHostelRoom,
  formatMessDetails,
} from '../utils/hostelFormat';

interface ProfilePageProps {
  network: VTOPNetwork;
}

const isValid = (val: string | null | undefined): val is string =>
  !!val &&
  val !== '-' &&
  val.trim() !== '' &&
  val.toUpperCase() !== 'N/A' &&
  val.toUpperCase() !== 'NA';

/** Same grouped-list geometry as the app: 18px on the outside, 4px inside. */
const groupedShape = (index: number, total: number): string => {
  if (total <= 1) return 'rounded-[18px]';
  if (index === 0) return 'rounded-t-[18px] rounded-b-[4px]';
  if (index === total - 1) return 'rounded-t-[4px] rounded-b-[18px]';
  return 'rounded-[4px]';
};

/** Section heading with the Android list's 14px lead-in spacer. */
const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <>
    <h2 className="pb-1.5 pl-1.5 text-sm font-bold tracking-[0.2px] text-(--accent-base)">
      {title}
    </h2>
    <div className="flex flex-col gap-0.5">{children}</div>
  </>
);

const SkeletonSection = ({ title, rows }: { title: string; rows: number }) => (
  <Section title={title}>
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        className={`h-17 bg-(--bg-surface) ${groupedShape(index, rows)}`}
      />
    ))}
  </Section>
);

interface RowItem {
  label: string;
  value: string;
  subtitle?: string;
  copy?: string;
  icon?: React.ReactNode;
}

const ListRow = ({
  label,
  value,
  subtitle,
  copy,
  icon,
  shape,
  large,
}: RowItem & { shape: string; large?: boolean }) => (
  <div className={`flex items-center bg-(--bg-surface) px-4 py-3 ${shape}`}>
    {icon && (
      <span className="mr-3.5 shrink-0 text-(--accent-base)">{icon}</span>
    )}
    <div className="min-w-0 flex-1">
      <div className="text-[13px] font-semibold leading-4 text-(--text-muted) opacity-85">
        {label}
      </div>
      <div className="mt-0.5 flex items-start justify-between gap-2">
        <div
          className={`min-w-0 whitespace-pre-line break-words font-bold text-(--text-main) ${large ? 'text-lg leading-6' : 'text-base leading-[22px]'}`}
        >
          {copy ? <CopyableText text={copy}>{value}</CopyableText> : value}
        </div>
      </div>
      {isValid(subtitle) && (
        <div className="mt-0.5 whitespace-pre-line break-words text-[13px] leading-[17px] text-(--text-muted)">
          {subtitle}
        </div>
      )}
    </div>
  </div>
);

const ListRows = ({ items, large }: { items: RowItem[]; large?: boolean }) =>
  items.map((item, index) => (
    <ListRow
      key={item.label}
      {...item}
      large={large}
      shape={groupedShape(index, items.length)}
    />
  ));

const ProctorCard = ({
  data,
  shape,
}: {
  data: StudentProfile['proctor'];
  shape: string;
}) => (
  <div
    className={`flex min-h-27 items-center gap-3.5 bg-(--bg-surface) px-3.5 py-3 ${shape}`}
  >
    {isValid(data.photoUrl) ? (
      <img
        src={data.photoUrl}
        alt={data.name || 'Proctor photo'}
        className="h-14 w-14 shrink-0 rounded-full bg-(--bg-surface) px-0.5 object-cover object-top"
      />
    ) : (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-(--bg-highlight)">
        <Person className="h-7 w-7 text-(--accent-base)" />
      </div>
    )}
    <div className="min-w-0 flex-1">
      <div className="break-words text-base font-bold leading-[22px] text-(--text-main)">
        {isValid(data.name) ? data.name : 'Proctor'}
      </div>
      {isValid(data.designation) && (
        <div className="mt-0.5 break-words text-xs font-medium leading-4 text-(--text-muted)">
          {data.designation}
        </div>
      )}
      {(isValid(data.school) || isValid(data.dept)) && (
        <div className="mt-[3px] whitespace-pre-line break-words text-[13px] leading-4 text-(--text-muted) opacity-85">
          {[data.school, data.dept].filter(isValid).join('\n')}
        </div>
      )}
    </div>
  </div>
);

const AddressRow = ({
  title,
  lines,
  phone,
  icon,
  shape,
}: {
  title: string;
  lines: string[];
  phone?: string;
  icon: React.ReactNode;
  shape: string;
}) => (
  <div className={`flex items-center bg-(--bg-surface) px-4 py-3 ${shape}`}>
    <span className="mr-3.5 shrink-0 text-(--accent-base)">{icon}</span>
    <div className="min-w-0 flex-1">
      <div className="text-[13px] font-semibold leading-4 text-(--text-muted) opacity-85">
        {title}
      </div>
      <div className="mt-0.5 text-sm font-bold leading-5 text-(--text-main)">
        {lines.map((line, index) => (
          <div key={index} className="break-words">
            {line}
          </div>
        ))}
      </div>
      {isValid(phone) && (
        <div className="mt-[3px] text-[13px] leading-[17px] text-(--text-muted)">
          <CopyableText text={phone}>Phone: {phone}</CopyableText>
        </div>
      )}
    </div>
  </div>
);

export const ProfilePage: React.FC<ProfilePageProps> = ({ network }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentProfile | null>(null);

  useEffect(() => {
    const persistProfile = (authId: string, profile: StudentProfile) => {
      const userPrefix = authId && authId !== '...' ? `${authId}_` : '';
      setCachedData(`${userPrefix}student_profile_parsed`, {
        ...profile,
        basic: { ...profile.basic, photoUrl: '' },
        proctor: { ...profile.proctor, photoUrl: '' },
      });
    };
    const hydrateStudentPhoto = async (
      authId: string,
      profile: StudentProfile,
    ): Promise<string> => {
      try {
        return (
          (await getUserProfileImage(authId || profile.basic.regNo || '')) || ''
        );
      } catch {
        return '';
      }
    };

    const loadProfile = async () => {
      if (useDataStore.getState().status === 'Demo Mode Active') {
        setData({
          basic: {
            name: 'Demo User',
            regNo: '22ABC1234',
            program: 'B.Tech. Computer Science and Engineering',
            school: 'School of Computer Science and Engineering',
            email: 'demo.user2022@vitstudent.ac.in',
            photoUrl: '',
          },
          personal: {
            appNo: '999999999',
            bloodGroup: 'O+ve',
            dob: '01-Jan-2004',
            gender: 'Male',
            nationality: 'Indian',
            religion: 'N/A',
            community: 'N/A',
            caste: 'N/A',
            nativeLanguage: 'English',
            nativeState: 'Tamil Nadu',
            physicallyChallenged: 'No',
            mobile: '9876543210',
            email: 'demo@gmail.com',
            aadhar: '123412341234',
          },
          hostel: {
            appNo: '999999999',
            regNo: '22ABC1234',
            block: 'Demo Block',
            room: '101',
            mess: 'Special Mess',
            bedType: '4',
          },
          proctor: {
            id: '123',
            name: 'Dr. John Doe',
            designation: 'Associate Professor',
            school: 'SCOPE',
            dept: 'Software Systems',
            mobile: '9988776655',
            email: 'john.doe@vit.ac.in',
            cabin: 'SJT 123',
            photoUrl: '',
          },
          currentAddress: {
            street: '123 Demo Street',
            area: 'Demo Area',
            city: 'Vellore',
            state: 'Tamil Nadu',
            country: 'India',
            pincode: '632014',
            phone: '',
          },
          permanentAddress: {
            street: '123 Demo Street',
            area: 'Demo Area',
            city: 'Vellore',
            state: 'Tamil Nadu',
            country: 'India',
            pincode: '632014',
            phone: '9876543210',
          },
          education: {
            school: 'Demo Public School',
            board: 'CBSE',
            medium: 'English',
            year: '2022',
            month: 'March',
            regNo: '1234567',
            degree: 'B.Tech',
            branch: 'CSE',
            qualification: 'High School',
            classObtained: 'First',
            breakInStudy: 'No',
            breakReason: '',
            address: {
              street: '',
              area: '',
              city: 'Vellore',
              state: 'Tamil Nadu',
              country: 'India',
              pincode: '632014',
              phone: '',
            },
          },
          family: {
            father: {
              name: 'Mr. Demo Father',
              designation: 'Engineer',
              organization: 'Demo Corp',
              qualification: 'B.E.',
              occupation: 'Private Service',
              income: 'N/A',
              mobile: '9999988888',
              email: 'father@demo.com',
              address: {
                street: '',
                area: '',
                city: 'Vellore',
                state: 'Tamil Nadu',
                country: 'India',
                pincode: '632014',
                phone: '',
              },
            },
            mother: {
              name: 'Mrs. Demo Mother',
              designation: 'Teacher',
              organization: 'Demo School',
              qualification: 'M.Sc.',
              occupation: 'Teaching',
              income: 'N/A',
              mobile: '8888899999',
              email: 'mother@demo.com',
              address: {
                street: '',
                area: '',
                city: 'Vellore',
                state: 'Tamil Nadu',
                country: 'India',
                pincode: '632014',
                phone: '',
              },
            },
            brothers: '1',
            sisters: '0',
            studyingInVit: '0',
            studiedInVit: '0',
            studyingDetails: '',
            studiedDetails: '',
            guardian: 'N/A',
            friendMobile: '9876501234',
          },
        });
        setLoading(false);
        return;
      }

      const authId =
        network.authorizedID || useDataStore.getState().user?.regNo;
      const userPrefix = authId && authId !== '...' ? `${authId}_` : '';
      const profileCacheKey = `${userPrefix}student_profile_parsed`;

      // 1. Fast restore from cached profile
      const cachedParsed = await getCachedData<StudentProfile>(profileCacheKey);
      if (cachedParsed?.basic?.name) {
        const photo = await hydrateStudentPhoto(authId, cachedParsed);
        setData({
          ...cachedParsed,
          basic: { ...cachedParsed.basic, photoUrl: photo },
        });
        setLoading(false);
      }

      // 2. Fetch fresh profile data
      try {
        const html = await network.fetchWithCache(
          'student_profile_data',
          async () =>
            await network.fetchFragment('studentsRecord/StudentProfileAllView'),
        );
        const parsedData: StudentProfile =
          typeof html === 'string' ? parseStudentProfile(html) : html;
        if (parsedData?.basic) {
          const storeUser = useDataStore.getState().user;
          if (
            !parsedData.basic.name &&
            storeUser?.name &&
            storeUser.name !== 'Student'
          ) {
            parsedData.basic.name = storeUser.name;
          }
          if (!parsedData.basic.regNo && (authId || storeUser?.regNo)) {
            parsedData.basic.regNo = authId || storeUser?.regNo || '';
          }
          parsedData.basic.photoUrl = await hydrateStudentPhoto(
            authId,
            parsedData,
          );

          setData(parsedData);
          persistProfile(authId, parsedData);

          resolveProctorPhoto(parsedData)
            .then((withPhoto) => {
              if (withPhoto.proctor?.photoUrl === parsedData.proctor?.photoUrl)
                return;
              setData(withPhoto);
              persistProfile(authId, withPhoto);
            })
            .catch(() => {});
        }
      } catch (e) {
        console.error('Failed to load profile data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    const handleRefresh = async () => {
      setLoading(true);
      const authId =
        network.authorizedID || useDataStore.getState().user?.regNo;
      const userPrefix = authId && authId !== '...' ? `${authId}_` : '';
      try {
        const html = await network.fetchWithCache(
          'student_profile_data',
          async () =>
            await network.fetchFragment('studentsRecord/StudentProfileAllView'),
          true,
        );
        const parsedData: StudentProfile =
          typeof html === 'string' ? parseStudentProfile(html) : html;
        if (parsedData?.basic) {
          const storeUser = useDataStore.getState().user;
          if (
            !parsedData.basic.name &&
            storeUser?.name &&
            storeUser.name !== 'Student'
          ) {
            parsedData.basic.name = storeUser.name;
          }
          if (!parsedData.basic.regNo && (authId || storeUser?.regNo)) {
            parsedData.basic.regNo = authId || storeUser?.regNo || '';
          }
          parsedData.basic.photoUrl = await hydrateStudentPhoto(
            authId,
            parsedData,
          );

          setData(parsedData);
          persistProfile(authId, parsedData);

          resolveProctorPhoto(parsedData)
            .then((withPhoto) => {
              if (withPhoto.proctor?.photoUrl === parsedData.proctor?.photoUrl)
                return;
              setData(withPhoto);
              persistProfile(authId, withPhoto);
            })
            .catch(() => {});
        }
      } catch (e) {
        console.error('Failed to refresh profile:', e);
      } finally {
        setLoading(false);
      }
    };
    window.addEventListener('retop-refresh-profile', handleRefresh);
    return () =>
      window.removeEventListener('retop-refresh-profile', handleRefresh);
  }, [network]);

  if (loading) {
    return (
      <div className="h-full w-full overflow-y-auto bg-(--bg-main) px-5 pb-26 pt-2 custom-scrollbar">
        <div className="mx-auto flex w-full max-w-3xl xl:max-w-5xl animate-pulse flex-col gap-2">
          <div className="flex items-center gap-4 pb-3 pt-2">
            <div className="h-27 w-27 shrink-0 rounded-2xl bg-(--bg-surface)" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-5 w-2/3 rounded bg-(--bg-highlight)" />
              <div className="h-4 w-1/3 rounded bg-(--bg-highlight)" />
              <div className="h-4 w-1/2 rounded bg-(--bg-highlight)" />
            </div>
          </div>
          <SkeletonSection title="Academic Information" rows={3} />
          <SkeletonSection title="Personal Details" rows={6} />
          <SkeletonSection title="Campus Residence" rows={3} />
          <SkeletonSection title="Proctor Details" rows={3} />
          <SkeletonSection title="Family Details" rows={3} />
          <SkeletonSection title="Addresses" rows={2} />
          <SkeletonSection title="Education History" rows={1} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const proctorContacts: RowItem[] = [];
  if (isValid(data.proctor.mobile)) {
    proctorContacts.push({
      label: 'Proctor Mobile',
      value: data.proctor.mobile,
      copy: data.proctor.mobile,
      icon: <Call className="h-6 w-6" />,
    });
  }
  if (isValid(data.proctor.email)) {
    proctorContacts.push({
      label: 'Proctor Email',
      value: data.proctor.email.toLowerCase(),
      copy: data.proctor.email,
      icon: <Mail className="h-6 w-6" />,
    });
  }
  if (isValid(data.proctor.cabin)) {
    proctorContacts.push({
      label: 'Proctor Cabin',
      value: data.proctor.cabin,
      icon: <MeetingRoom className="h-6 w-6" />,
    });
  }

  const academicItems: RowItem[] = [];
  const program = isValid(data.education.degree)
    ? data.education.degree
    : data.basic.program;
  if (isValid(program)) {
    academicItems.push({
      label: 'Degree',
      value: program,
      icon: <School className="h-6 w-6" />,
    });
  }
  if (isValid(data.education.branch)) {
    academicItems.push({
      label: 'Branch / Program',
      value: data.education.branch,
      icon: <MenuBook className="h-6 w-6" />,
    });
  }
  if (isValid(data.basic.school)) {
    academicItems.push({
      label: 'School',
      value: data.basic.school,
      icon: <AccountBalance className="h-6 w-6" />,
    });
  }

  const residenceItems: RowItem[] = [];
  if (data.hostel) {
    const block = formatHostelBlock(data.hostel.block);
    const room = formatHostelRoom(data.hostel.room);
    const bed = formatBedType(data.hostel.bedType);
    const mess = formatMessDetails(data.hostel.mess);
    if (isValid(block.displayName)) {
      residenceItems.push({
        label: 'Hostel Block',
        value: block.displayName,
      });
    }
    if (isValid(room)) {
      residenceItems.push({
        label: 'Room Number',
        value: room,
        icon: <MeetingRoom className="h-6 w-6" />,
      });
    }
    if (isValid(bed)) {
      residenceItems.push({
        label: 'Bed Type',
        value: bed,
        icon: <KingBed className="h-6 w-6" />,
      });
    }
    if (isValid(mess.messType)) {
      residenceItems.push({
        label: 'Mess Facility',
        value: mess.messType,
        subtitle: mess.caterer,
        icon: <Restaurant className="h-6 w-6" />,
      });
    }
  } else {
    residenceItems.push({
      label: 'Residence',
      value: 'Day Scholar',
      subtitle: 'Off-Campus Student',
      icon: <DirectionsBus className="h-6 w-6" />,
    });
  }

  // Android shows the student's phone/email in the hero, so it has no
  // separate contact rows here.
  const institutionalEmail = isValid(data.basic.email)
    ? data.basic.email
    : data.personal.email;

  const personalItems: RowItem[] = [];
  if (isValid(data.personal.dob)) {
    personalItems.push({
      label: 'Date of Birth',
      value: data.personal.dob.replace(/-/g, ' '),
      icon: <CalendarMonth className="h-6 w-6" />,
    });
  }
  if (isValid(data.personal.gender)) {
    personalItems.push({
      label: 'Gender',
      value: data.personal.gender,
      icon: <Person className="h-6 w-6" />,
    });
  }
  if (isValid(data.personal.bloodGroup)) {
    personalItems.push({
      label: 'Blood Group',
      value: data.personal.bloodGroup.toUpperCase(),
      icon: <Bloodtype className="h-6 w-6" />,
    });
  }
  if (isValid(data.personal.nativeLanguage)) {
    personalItems.push({
      label: 'Native Language',
      value: data.personal.nativeLanguage,
      icon: <TranslateIndic className="h-6 w-6" />,
    });
  }
  if (isValid(data.personal.nativeState)) {
    personalItems.push({
      label: 'Native State',
      value: data.personal.nativeState,
      icon: <LocationOn className="h-6 w-6" />,
    });
  }
  if (isValid(data.personal.nationality)) {
    personalItems.push({
      label: 'Nationality',
      value: data.personal.nationality,
      icon: <Flag className="h-6 w-6" />,
    });
  }
  const religionCommunity = [data.personal.religion, data.personal.community]
    .filter(isValid)
    .join(' / ');
  if (isValid(religionCommunity)) {
    personalItems.push({
      label: 'Religion / Community',
      value: religionCommunity,
      icon: <DiversityThree className="h-6 w-6" />,
    });
  }

  const addressItem = (
    title: string,
    address: StudentProfile['currentAddress'],
  ) => {
    const areaCity = [address.area, address.city].filter(isValid).join(', ');
    const stateCountry = [address.state, address.country]
      .filter(isValid)
      .join(', ');
    const statePin = [stateCountry, address.pincode]
      .filter(isValid)
      .join(' - ');
    const lines = [address.street, areaCity, statePin].filter(isValid);
    return lines.length > 0 ? { title, lines, phone: address.phone } : null;
  };
  const addressItems = [
    addressItem('Current Address', data.currentAddress),
    addressItem('Permanent Address', data.permanentAddress),
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  const educationItems: RowItem[] = [];
  if (isValid(data.education.school)) {
    const boardMedium = [
      isValid(data.education.board) ? `Board: ${data.education.board}` : '',
      isValid(data.education.medium) ? `Medium: ${data.education.medium}` : '',
    ]
      .filter(isValid)
      .join(' · ');
    const year = [data.education.year, data.education.month]
      .filter(isValid)
      .join(' ');
    const yearReg = [
      isValid(year) ? `Year: ${year}` : '',
      isValid(data.education.regNo) ? `Reg: ${data.education.regNo}` : '',
    ]
      .filter(isValid)
      .join(' · ');
    educationItems.push({
      label: isValid(data.education.qualification)
        ? data.education.qualification
        : 'Previous Education',
      value: data.education.school,
      subtitle: [boardMedium, yearReg].filter(isValid).join('\n') || undefined,
      icon: <School className="h-6 w-6" />,
    });
  }

  const familyItems: RowItem[] = [];
  const parentSubtitle = (parent: StudentProfile['family']['father']) =>
    [
      [parent.designation, parent.organization].filter(isValid).join(' at '),
      [
        parent.qualification,
        parent.occupation,
        isValid(parent.income) ? `Income: ${parent.income}` : '',
      ]
        .filter(isValid)
        .join(' / '),
    ]
      .filter(isValid)
      .join('\n') || undefined;

  if (isValid(data.family.father.name)) {
    familyItems.push({
      label: 'Father',
      value: data.family.father.name,
      subtitle: parentSubtitle(data.family.father),
      icon: <Person className="h-6 w-6" />,
    });
    if (isValid(data.family.father.mobile)) {
      familyItems.push({
        label: 'Father Mobile',
        value: data.family.father.mobile,
        copy: data.family.father.mobile,
        icon: <Call className="h-6 w-6" />,
      });
    }
    if (isValid(data.family.father.email)) {
      familyItems.push({
        label: 'Father Email',
        value: data.family.father.email.toLowerCase(),
        copy: data.family.father.email,
        icon: <Mail className="h-6 w-6" />,
      });
    }
  }
  if (isValid(data.family.mother.name)) {
    familyItems.push({
      label: 'Mother',
      value: data.family.mother.name,
      subtitle: parentSubtitle(data.family.mother),
      icon: <Person className="h-6 w-6" />,
    });
    if (isValid(data.family.mother.mobile)) {
      familyItems.push({
        label: 'Mother Mobile',
        value: data.family.mother.mobile,
        copy: data.family.mother.mobile,
        icon: <Call className="h-6 w-6" />,
      });
    }
    if (isValid(data.family.mother.email)) {
      familyItems.push({
        label: 'Mother Email',
        value: data.family.mother.email.toLowerCase(),
        copy: data.family.mother.email,
        icon: <Mail className="h-6 w-6" />,
      });
    }
  }
  if (
    isValid(data.family.guardian) &&
    data.family.guardian.toUpperCase() !== 'PARENT'
  ) {
    familyItems.push({
      label: 'Local Guardian',
      value: data.family.guardian,
      icon: <Person className="h-6 w-6" />,
    });
  }
  if (isValid(data.family.brothers) || isValid(data.family.sisters)) {
    familyItems.push({
      label: 'Siblings',
      value: `Brothers: ${data.family.brothers || '0'}\nSisters: ${data.family.sisters || '0'}`,
      icon: <Groups className="h-6 w-6" />,
    });
  }
  const familyIncome = [
    data.family.father.income,
    data.family.mother.income,
  ].find(isValid);
  if (familyIncome) {
    familyItems.push({
      label: 'Annual Income',
      value: familyIncome,
      icon: <Payments className="h-6 w-6" />,
    });
  }
  if (isValid(data.family.friendMobile)) {
    familyItems.push({
      label: 'Emergency / Friend Mobile',
      value: data.family.friendMobile,
      copy: data.family.friendMobile,
      icon: <Call className="h-6 w-6" />,
    });
  }

  const heroInitials =
    (data.basic.name || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || '?';

  return (
    <div className="h-full w-full overflow-y-auto bg-(--bg-main) px-5 pb-26 pt-2 custom-scrollbar">
      <div className="mx-auto flex w-full max-w-3xl xl:max-w-5xl flex-col gap-2">
        {/* Hero: circular avatar + identity, then contacts in two columns */}
        <div className="flex flex-col gap-3 pb-3 pt-2">
          <div className="flex items-center gap-4">
            <div className="flex h-27 w-27 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--bg-surface)">
              {isValid(data.basic.photoUrl) ? (
                <img
                  src={data.basic.photoUrl}
                  alt={data.basic.name || 'Student photo'}
                  className="h-full w-full bg-white px-1 object-contain"
                />
              ) : (
                <span className="text-[22px] font-bold text-(--text-muted)">
                  {heroInitials}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <div className="line-clamp-2 text-[22px] font-bold leading-tight text-(--text-main)">
                {isValid(data.basic.name) ? data.basic.name : 'Student'}
              </div>
              {isValid(data.basic.regNo) && (
                <div className="text-[15px] font-bold text-(--accent-base)">
                  <CopyableText text={data.basic.regNo}>
                    {data.basic.regNo}
                  </CopyableText>
                </div>
              )}
              {isValid(data.personal.appNo) && (
                <div className="text-sm font-semibold text-(--text-main)">
                  <CopyableText text={data.personal.appNo}>
                    Application Number: {data.personal.appNo}
                  </CopyableText>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
            {isValid(data.personal.mobile) && (
              <div className="flex items-center gap-2 px-0 py-1.5">
                <Call className="h-5 w-5 shrink-0 text-(--accent-base)" />
                <div className="min-w-0 text-sm font-medium text-(--text-main)">
                  <CopyableText text={data.personal.mobile}>
                    {data.personal.mobile}
                  </CopyableText>
                </div>
              </div>
            )}
            {isValid(institutionalEmail) && (
              <div className="flex items-center gap-2 px-0 py-1.5">
                <Mail className="h-5 w-5 shrink-0 text-(--accent-base)" />
                <div className="min-w-0 truncate text-[13px] text-(--text-muted)">
                  <CopyableText text={institutionalEmail}>
                    {institutionalEmail.toLowerCase()}
                  </CopyableText>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <div className="min-w-0">
            {academicItems.length > 0 && (
              <Section title="Academic Information">
                <ListRows items={academicItems} />
              </Section>
            )}
          </div>
          <div className="min-w-0">
            {personalItems.length > 0 && (
              <Section title="Personal Details">
                <ListRows items={personalItems} />
              </Section>
            )}
          </div>
          <div className="min-w-0">
            <Section title="Campus Residence">
              <ListRows items={residenceItems} large />
            </Section>
          </div>
          <div className="min-w-0">
            {(isValid(data.proctor.name) ||
              isValid(data.proctor.mobile) ||
              isValid(data.proctor.email)) && (
              <Section title="Proctor Details">
                <ProctorCard
                  data={data.proctor}
                  shape={groupedShape(0, 1 + proctorContacts.length)}
                />
                {proctorContacts.map((item, index) => (
                  <ListRow
                    key={item.label}
                    {...item}
                    shape={groupedShape(index + 1, 1 + proctorContacts.length)}
                  />
                ))}
              </Section>
            )}
          </div>
          <div className="min-w-0">
            {familyItems.length > 0 && (
              <Section title="Family Details">
                <ListRows items={familyItems} />
              </Section>
            )}
          </div>
          <div className="min-w-0">
            {addressItems.length > 0 && (
              <Section title="Addresses">
                {addressItems.map((item, index) => (
                  <AddressRow
                    key={item.title}
                    {...item}
                    icon={
                      item.title.toLowerCase().includes('permanent') ? (
                        <Home className="h-6 w-6" />
                      ) : (
                        <LocationOn className="h-6 w-6" />
                      )
                    }
                    shape={groupedShape(index, addressItems.length)}
                  />
                ))}
              </Section>
            )}
          </div>
          <div className="min-w-0">
            {educationItems.length > 0 && (
              <Section title="Education History">
                <ListRows items={educationItems} />
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
