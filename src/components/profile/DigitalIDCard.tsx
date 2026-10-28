import React from 'react';
import { StudentProfile } from '../../types/vtop';
import { VitLogo } from '../VitLogo';
import { Person } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { Barcode } from '../common/Barcode';

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
  );
};

export const DigitalIDCard = ({ data }: { data: StudentProfile }) => {
  const [isFlipped, setIsFlipped] = React.useState(false);
  const isHosteller = !!data.hostel;
  const address = data.permanentAddress;
  const contactNo =
    data.permanentAddress.phone || data.personal.mobile || 'Not Provided';

  const fontArial = "font-['Arial',Helvetica,sans-serif]!";
  const fontTimes = "font-['Times_New_Roman',Times,serif]!";

  const fullName = toTitleCase(data?.basic?.name ?? '');
  const isShortName = fullName.length < 17;

  const words = fullName.split(' ');
  const line1 = words[0] || '';
  const line2 = words.slice(1).join(' ') || '';

  const isChennai =
    (data as any).campus === 'chennai' ||
    (typeof window !== 'undefined' &&
      window.location.hostname.includes('vtopcc')) ||
    (typeof window !== 'undefined' &&
      (window as any)._retopCampus === 'chennai');
  const campusName = isChennai ? 'CHENNAI' : 'VELLORE';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Student ID card. Tap or click to flip."
      onClick={() => setIsFlipped((prev) => !prev)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsFlipped((prev) => !prev);
        }
      }}
      className="retop-digital-id-card group w-full max-w-74 aspect-64/100 perspective-[1000px] cursor-pointer shrink-0 select-none touch-manipulation focus:outline-none"
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-3d shadow-none rounded-2xl ${
          isFlipped
            ? 'transform-[rotateY(180deg)]'
            : 'md:group-hover:transform-[rotateY(180deg)]'
        }`}
      >
        {/* FRONT SIDE */}
        <div
          className={`absolute inset-0 backface-hidden rounded-2xl border-2 border-border-dim flex flex-col overflow-hidden ${fontArial}`}
          style={{ backgroundColor: 'white', color: 'black' }}
        >
          <div className="flex flex-col items-center pt-3 px-3 shrink-0">
            <div className="w-47.5 mx-auto flex justify-center [&>svg]:w-full [&>svg]:h-[auto!important] [&>svg]:max-h-16.25">
              <VitLogo />
            </div>

            <h3
              className={`text-[17px] font-extrabold scale-x-120 text-black ${fontTimes}`}
            >
              {campusName} CAMPUS
            </h3>
          </div>

          <div className="flex-1 flex flex-col justify-center top-1 items-center px-4 w-full">
            <div
              className={`overflow-hidden flex items-center justify-center z-10 transition-all w-[108px] h-[165px]`}
            >
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

          <div
            className={`flex flex-col items-center justify-center text-center shrink-0 pb-1 w-full ${isShortName ? '' : '-mt-2'}`}
          >
            {isShortName ? (
              <div
                className={`font-bold text-[25px] ${fontArial} text-[#181d79] leading-none text-center px-2 mt-6`}
              >
                {fullName}
              </div>
            ) : (
              <div
                className={`font-bold text-[25px] ${fontArial} text-[#181d79] leading-[1.1] flex flex-col items-center justify-center text-center w-full mt-1 px-2`}
              >
                <span className={`${fontArial}`}>{line1}</span>
                <span className={`${fontArial}`}>{line2}</span>
              </div>
            )}

            <div
              className={`font-bold text-[18px] ${fontArial} text-black mt-1 text-center`}
            >
              {data.basic.regNo}
            </div>
          </div>

          <div
            className={`text-[#ffffff] text-center py-1 font-bold text-[22px] shrink-0 ${fontArial}`}
            style={{
              backgroundColor: isHosteller ? '#181d79' : '#C41E3A',
            }}
          >
            {isHosteller ? 'HOSTELLER' : 'DAY SCHOLAR'}
          </div>
        </div>

        {/* BACK SIDE */}
        <div
          className={`absolute inset-0 backface-hidden transform-[rotateY(180deg)] rounded-2xl border-2 border-border-dim flex flex-col p-3 text-[12px] leading-tight overflow-hidden`}
          style={{ backgroundColor: 'white', color: 'black' }}
        >
          <div className="flex gap-1">
            <span className={`italic font-bold ${fontTimes}`}>App. No:</span>{' '}
            <span className={`font-bold ml-1 ${fontArial}`}>
              {data.personal.appNo}
            </span>
          </div>

          <div className="flex gap-1 mt-1">
            <span className={`italic font-bold ${fontTimes}`}>
              Blood Group :
            </span>{' '}
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
            {isChennai ? (
              <>
                Vellore Institute of Technology,
                <br />
                Vandalur - Kelambakkam Road,
                <br />
                Chennai - 600 127, Tamilnadu, India.
                <br />
                Ph : 044 3993 1555
              </>
            ) : (
              <>
                Vellore Institute of Technology,
                <br />
                Vellore - 632 014, Tamilnadu, India.
                <br />
                Ph : 0416 224 3091
                <br />
                Fax : 0416 224 3092
              </>
            )}
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
            </span>{' '}
            <span className={`font-bold text-[13px] ml-1 ${fontArial}`}>
              JUL-2028
            </span>
          </div>

          <div className="mt-2 flex justify-between text-[11px] items-end px-2">
            <div className="text-center flex flex-col items-center">
              <span
                className={`text-xl -mb-2 text-content-dim ${fontArial}`}
              ></span>
              <span className={fontArial}> </span>
            </div>
            <div className="text-center flex flex-col items-center">
              <span
                className={`text-xl -mb-2 text-content-dim ${fontArial}`}
              ></span>
              <span className={fontArial}> </span>
            </div>
          </div>

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
                font="Arial"
              />
            </div>
            <div className={`font-bold text-[13px] ${fontArial} mt-1`}>
              Website : www.vit.ac.in
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
