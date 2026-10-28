import React from 'react';
import { createRoot } from 'react-dom/client';
import { DigitalIDCard } from './components/profile/DigitalIDCard';
import { StudentProfile } from './types/vtop';

const defaultMockProfile: StudentProfile = {
  basic: {
    name: 'Alex Doe',
    regNo: '22BCE1234',
    email: 'alex.doe2022@vitstudent.ac.in',
    program: 'B.Tech Computer Science and Engineering',
    school: 'School of Computer Science and Engineering',
    photoUrl: '',
  },
  personal: {
    appNo: '2022100000',
    dob: '01-JAN-2004',
    gender: 'MALE',
    bloodGroup: 'O+',
    community: 'OC',
    caste: 'GENERAL',
    religion: 'HINDU',
    nationality: 'INDIAN',
    nativeState: 'TAMIL NADU',
    nativeLanguage: 'TAMIL',
    physicallyChallenged: 'NO',
    aadhar: '',
    mobile: '+91 9876543210',
    email: 'alex.doe2022@vitstudent.ac.in',
  },
  permanentAddress: {
    street: '123, Sample Street',
    area: 'Sample Area',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    pincode: '600001',
    phone: '+91 9876543210',
  },
  currentAddress: {
    street: '123, Sample Street',
    area: 'Sample Area',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    pincode: '600001',
    phone: '+91 9876543210',
  },
  education: {} as any,
  family: {} as any,
  proctor: {} as any,
  hostel: {
    appNo: '2022100000',
    regNo: '22BCE1234',
    block: 'Q',
    room: '101',
    bedType: 'AC',
    mess: 'Special',
  },
};

function App() {
  const [profile] = React.useState<StudentProfile>(() => {
    try {
      const cached = localStorage.getItem('retop_cached_profile');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.basic?.name) return parsed;
      }
    } catch {}
    return defaultMockProfile;
  });

  return (
    <div
      className="min-h-screen w-screen flex flex-col items-center justify-center overflow-hidden relative"
      style={{
        background:
          'radial-gradient(circle at 50% 35%, #ffffff 0%, #f8fafc 45%, #e2e8f0 100%)',
      }}
    >
      {/* Studio lighting background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(241,245,249,0.4) 60%, rgba(203,213,225,0.6) 100%)',
        }}
      />

      {/* ID Card Wrapper with fixed 296x462.5 dimensions */}
      <div className="relative z-10 flex flex-col items-center justify-center p-6">
        <div
          className="relative rounded-2xl shrink-0"
          style={{
            width: '296px',
            height: '462.5px',
            filter:
              'drop-shadow(0 25px 35px rgba(0, 0, 0, 0.12)) drop-shadow(0 10px 15px rgba(0, 0, 0, 0.06))',
          }}
        >
          <DigitalIDCard data={profile} />
        </div>

        {/* Soft floor shadow */}
        <div
          className="w-56 h-5 rounded-[100%] mt-4 pointer-events-none opacity-40 blur-md"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.4) 0%, rgba(15, 23, 42, 0) 70%)',
          }}
        />
      </div>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
