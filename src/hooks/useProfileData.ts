import { useState, useEffect } from "react";
import { VTOPNetwork } from "../utils/network";
import { getCachedData, setCachedData } from "../utils/cache";
import { useDataStore } from "../store/dataStore";
import { parseStudentProfile } from "../parsers/profile";
import { StudentProfile } from "../types/vtop";

export function useProfileData(network: VTOPNetwork) {
  const [loading, setLoading] = useState(true);
  const [rawProfileData, setRawProfileData] = useState<StudentProfile | null>(null);
  const [offlineMiss, setOfflineMiss] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (useDataStore.getState().status === "Demo Mode Active") {
        setRawProfileData({
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

      try {
        const userPrefix = network.authorizedID ? `${network.authorizedID}_` : "";
        const cachedObj = await getCachedData<StudentProfile>(`${userPrefix}student_profile_parsed`);
        if (cachedObj && cachedObj.basic?.name && (!network.authorizedID || cachedObj.basic.regNo === network.authorizedID)) {
          setRawProfileData(cachedObj);
        }

        const html = await network.fetchWithCache(
          "student_profile_data",
          async () =>
            await network.fetchFragment("studentsRecord/StudentProfileAllView"),
        );
        const parsedData = parseStudentProfile(html);
        if (parsedData?.basic?.name) {
          setRawProfileData(parsedData);
          setCachedData(`${userPrefix}student_profile_parsed`, parsedData);
        }
      } catch (e: any) {
        if (e && e.message === "OFFLINE_CACHE_MISS") {
          setOfflineMiss(true);
        } else {
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [network]);

  return { loading, rawProfileData, offlineMiss };
}
