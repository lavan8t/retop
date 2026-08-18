import {
  StudentProfile,
  ProfileBasicInfo,
  ProfilePersonal,
  Address,
  ProfileEducation,
  ProfileFamily,
  ProfileProctor,
  ProfileHostel,
  ProfileFamilyMember,
} from "../types/vtop";

function fixBase64Image(src: string | null | undefined): string {
  if (!src) return "";
  const s = src.trim();
  if (s.startsWith("data:") && (s.length < 50 || s.endsWith("base64,"))) return "";
  if (s.startsWith("data:null;base64")) {
    return s.replace("data:null;base64", "data:image/jpeg;base64");
  }
  if (s.startsWith("data:jpg;base64")) {
    return s.replace("data:jpg;base64", "data:image/jpeg;base64");
  }
  return s;
}

function cleanText(text: string | undefined | null): string {
  if (!text) return "";
  return text.replace(/:/g, "").replace(/\s+/g, " ").trim();
}

function parseSectionMap(
  doc: Document,
  sectionId: string,
): Map<string, string> {
  const map = new Map<string, string>();
  const container = doc.querySelector(`#${sectionId}`);
  if (!container) return map;

  const rows = container.querySelectorAll("tr");
  let currentContext = "MAIN";

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");

    // Detect Context Headers (e.g., CURRENT ADDRESS, FATHER DETAILS)
    if (cells.length === 1 && cells[0].hasAttribute("colspan")) {
      const headerText = cleanText(cells[0].textContent).toUpperCase();
      if (headerText) currentContext = headerText;
      return;
    }

    // Extract Key-Value Pairs
    if (cells.length >= 2) {
      // Loop with -1 to safely prevent reading rowspan image tags as text
      for (let i = 0; i < cells.length - 1; i += 2) {
        const key = cleanText(cells[i].textContent).toUpperCase();
        const val = cleanText(cells[i + 1]?.textContent);
        if (key) {
          map.set(`${currentContext}_${key}`, val);
        }
      }
    }
  });

  return map;
}

import { parseHTMLFast } from "../utils/parser-utils";

export function parseStudentProfile(html: string): StudentProfile {
  const doc = parseHTMLFast(html);

  const basic: ProfileBasicInfo = {
    name: cleanText(doc.querySelector(".col-4 p")?.textContent),
    regNo: "",
    email: "",
    program: "",
    school: "",
    photoUrl: fixBase64Image(
      doc.querySelector(".col-4 img")?.getAttribute("src"),
    ),
  };

  const labels = doc.querySelectorAll("label.col-form-label");
  labels.forEach((label) => {
    const text = cleanText(label.textContent).toUpperCase();
    const sibling = cleanText(label.nextElementSibling?.textContent);
    if (text.includes("REGISTER NUMBER")) basic.regNo = sibling;
    if (text.includes("VIT EMAIL")) basic.email = sibling;
    if (text.includes("PROGRAM")) basic.program = sibling;
    if (text.includes("SCHOOL NAME")) basic.school = sibling;
  });

  const pMap = parseSectionMap(doc, "collapseOne");
  const personal: ProfilePersonal = {
    appNo: pMap.get("MAIN_APPLICATION NUMBER") || "",
    dob: pMap.get("MAIN_DATE OF BIRTH") || "",
    gender: pMap.get("MAIN_GENDER") || "",
    bloodGroup: pMap.get("MAIN_BLOOD GROUP") || "",
    community: pMap.get("MAIN_COMMUNITY") || "",
    caste: pMap.get("MAIN_CASTE") || "",
    religion: pMap.get("MAIN_RELIGION") || "",
    nationality: pMap.get("MAIN_NATIONALITY") || "",
    nativeState: pMap.get("MAIN_NATIVE STATE") || "",
    nativeLanguage: pMap.get("MAIN_NATIVE LANGUAGE") || "",
    physicallyChallenged: pMap.get("MAIN_PHYSICALLY CHALLENGED") || "NO",
    aadhar: pMap.get("MAIN_AADHAR NUMBER") || "",
    mobile: pMap.get("MAIN_MOBILE NUMBER") || "",
    email:
      pMap.get("PERMANENT ADDRESS_EMAIL") ||
      pMap.get("CURRENT ADDRESS_EMAIL") ||
      pMap.get("MAIN_EMAIL") ||
      "",
  };

  const currentAddress: Address = {
    street: pMap.get("CURRENT ADDRESS_STREET NAME") || "",
    area: pMap.get("CURRENT ADDRESS_AREA NAME") || "",
    city: pMap.get("CURRENT ADDRESS_CITY") || "",
    state: pMap.get("CURRENT ADDRESS_STATE") || "",
    country: pMap.get("CURRENT ADDRESS_COUNTRY") || "",
    pincode: pMap.get("CURRENT ADDRESS_PINCODE") || "",
    phone: pMap.get("CURRENT ADDRESS_PHONE NUMBER[LAND LINE]") || "",
  };

  const permanentAddress: Address = {
    street: pMap.get("PERMANENT ADDRESS_STREET NAME") || "",
    area: pMap.get("PERMANENT ADDRESS_AREA NAME") || "",
    city: pMap.get("PERMANENT ADDRESS_CITY") || "",
    state: pMap.get("PERMANENT ADDRESS_STATE") || "",
    country: pMap.get("PERMANENT ADDRESS_COUNTRY") || "",
    pincode: pMap.get("PERMANENT ADDRESS_PINCODE") || "",
    phone: pMap.get("PERMANENT ADDRESS_PHONE NUMBER[LAND LINE]") || "",
  };

  const eMap = parseSectionMap(doc, "collapseTwo");
  const education: ProfileEducation = {
    degree: eMap.get("MAIN_APPLIED DEGREE") || "",
    qualification: eMap.get("MAIN_EDUCATIONAL QUALIFICATION") || "",
    branch: eMap.get("MAIN_BRANCH / GROUP STUDIED") || "",
    school: eMap.get("MAIN_SCHOOL NAME") || "",
    medium: eMap.get("MAIN_MEDIUM OF STUDY") || "",
    board: eMap.get("MAIN_BOARD / UNIVERSITY") || "",
    regNo: eMap.get("MAIN_REGISTER NO/ ROLL NO") || "",
    classObtained: eMap.get("MAIN_CLASS OBTAINED") || "",
    year: eMap.get("MAIN_YEAR OF PASSING/ PASSED") || "",
    month: eMap.get("MAIN_MONTH OF PASSING/ PASSED") || "",
    breakInStudy:
      eMap.get("SCHOOL / COLLEGE ADDRESS_BREAK IN STUDY") ||
      eMap.get("MAIN_BREAK IN STUDY") ||
      "NO",
    breakReason:
      eMap.get("SCHOOL / COLLEGE ADDRESS_REASON") ||
      eMap.get("MAIN_REASON") ||
      "-",
    address: {
      street: "",
      area: eMap.get("SCHOOL / COLLEGE ADDRESS_AREA NAME") || "",
      city:
        eMap.get("SCHOOL / COLLEGE ADDRESS_CITY / DISTRICT NAME") ||
        eMap.get("SCHOOL / COLLEGE ADDRESS_CITY") ||
        "",
      state:
        eMap.get("SCHOOL / COLLEGE ADDRESS_STATE NAME") ||
        eMap.get("SCHOOL / COLLEGE ADDRESS_STATE") ||
        "",
      country: "",
      pincode:
        eMap.get("SCHOOL / COLLEGE ADDRESS_PINCODE / ZIPCODE") ||
        eMap.get("SCHOOL / COLLEGE ADDRESS_PINCODE") ||
        "",
      phone: eMap.get("SCHOOL / COLLEGE ADDRESS_PHONE NUMBER[LAND LINE]") || "",
    },
  };

  const fMap = parseSectionMap(doc, "collapseThree");
  const getFamilyMember = (prefix: string): ProfileFamilyMember => ({
    name:
      fMap.get(`${prefix}_FATHER NAME`) ||
      fMap.get(`${prefix}_MOTHER NAME`) ||
      fMap.get(`${prefix}_NAME`) ||
      "",
    qualification: fMap.get(`${prefix}_QUALIFICATION`) || "",
    occupation: fMap.get(`${prefix}_OCCUPATION`) || "",
    organization: fMap.get(`${prefix}_ORGANIZATION`) || "",
    designation: fMap.get(`${prefix}_DESIGNATION`) || "",
    mobile: fMap.get(`${prefix}_MOBILE NUMBER`) || "",
    email: fMap.get(`${prefix}_EMAIL`) || "",
    income: fMap.get(`${prefix}_ANNUAL INCOME`) || "",
    address: {
      street: "",
      area: fMap.get(`${prefix}_OFFICIAL ADDRESS(AREA NAME)`) || "",
      city:
        fMap.get(`${prefix}_CITY/DISTRICT`) || fMap.get(`${prefix}_CITY`) || "",
      state: fMap.get(`${prefix}_STATE`) || "",
      country: "",
      pincode:
        fMap.get(`${prefix}_PINCODE/ZIPCODE`) ||
        fMap.get(`${prefix}_PINCODE`) ||
        "",
      phone: fMap.get(`${prefix}_PHONE NUMBER[LAND LINE]`) || "",
    },
  });

  const family: ProfileFamily = {
    brothers: fMap.get("MAIN_NO.OF.BROTHERS") || "0",
    sisters: fMap.get("MAIN_NO.OF.SISTERS") || "0",
    studyingInVit: fMap.get("MAIN_IF BROTHER/SISTER STUDYING IN VIT") || "NO",
    studyingDetails: fMap.get("MAIN_STUDYING DETAILS") || "-",
    studiedInVit: fMap.get("MAIN_IF BROTHER/SISTER STUDIED IN VIT") || "NO",
    studiedDetails: fMap.get("MAIN_STUDIED DETAILS") || "-",
    father: getFamilyMember("FATHER DETAILS"),
    mother: getFamilyMember("MOTHER DETAILS"),
    guardian:
      fMap.get("FATHER DETAILS_GUARDIAN INFO") ||
      fMap.get("MOTHER DETAILS_GUARDIAN INFO") ||
      "PARENT",
    friendMobile: pMap.get("PERMANENT ADDRESS_FRIEND MOBILE NUMBER") || "",
  };

  const procMap = parseSectionMap(doc, "collapseFour");
  const proctorImg = doc
    .querySelector("#collapseFour img")
    ?.getAttribute("src");

  const proctor: ProfileProctor = {
    id: procMap.get("MAIN_FACULTY ID") || "",
    name: procMap.get("MAIN_FACULTY NAME") || "",
    designation: procMap.get("MAIN_FACULTY DESIGNATION") || "",
    school: procMap.get("MAIN_SCHOOL") || "",
    cabin: procMap.get("MAIN_CABIN") || "",
    dept: procMap.get("MAIN_FACULTY DEPARTMENT") || "",
    email: procMap.get("MAIN_FACULTY EMAIL") || "",
    mobile: procMap.get("MAIN_FACULTY MOBILE NUMBER") || "",
    photoUrl: fixBase64Image(proctorImg),
  };

  const hMap = parseSectionMap(doc, "collapseFive");
  let hostel: ProfileHostel | null = null;
  const hostelNotFound = doc
    .querySelector("#collapseFive")
    ?.textContent?.includes("NOT FOUND");

  if (!hostelNotFound && hMap.size > 0) {
    hostel = {
      appNo: hMap.get("MAIN_APPLICATION NUMBER") || "",
      regNo: hMap.get("MAIN_REGISTER NUMBER") || "",
      block: hMap.get("MAIN_BLOCK NAME") || "",
      room: hMap.get("MAIN_ROOM NO.") || "",
      bedType: hMap.get("MAIN_BED TYPE") || "",
      mess: hMap.get("MAIN_MESS INFORMATION") || "",
    };
  }

  return {
    basic,
    personal,
    currentAddress,
    permanentAddress,
    education,
    family,
    proctor,
    hostel,
  };
}
