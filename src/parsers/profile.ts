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
import { parseHTMLFast, validateParsed, Versioned } from "../utils/parser-utils";
import { StudentProfileSchema } from "../schemas";

export const PROFILE_SCHEMA_VERSION = 1;

export function fixBase64Image(src: string | null | undefined): string {
  if (!src) return "";
  const s = src.trim();
  if (s.startsWith("data:") && (s.length < 50 || s.endsWith("base64,"))) return "";
  if (s.startsWith("data:null;base64")) {
    return s.replace("data:null;base64", "data:image/jpeg;base64");
  }
  if (s.startsWith("data:jpg;base64")) {
    return s.replace("data:jpg;base64", "data:image/jpeg;base64");
  }
  if (s.startsWith("data:image")) return s;

  // 1. Raw Base64 image payload (JPEG starts with /9j, PNG starts with iVBORw0KGgo, GIF with R0lGOD, WebP with UklGR)
  const clean = s.replace(/\s+/g, "");
  if (
    clean.startsWith("/9j/") ||
    clean.startsWith("/9j") ||
    clean.startsWith("iVBORw0KGgo") ||
    clean.startsWith("R0lGOD") ||
    clean.startsWith("UklGR")
  ) {
    const mime = clean.startsWith("iVBOR") ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${clean}`;
  }

  // Pure base64 alphanumeric string without server paths
  if (
    clean.length > 80 &&
    /^[A-Za-z0-9+/=]+$/.test(clean) &&
    !clean.includes("users/image") &&
    !clean.includes("vtop") &&
    !clean.includes("process/")
  ) {
    return `data:image/jpeg;base64,${clean}`;
  }

  // 2. Standard web URLs & blob URIs
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("blob:")) return s;

  // 3. Server relative paths
  if (s.startsWith("/vtop/")) return s;
  if (s.startsWith("users/image") || s.startsWith("process/") || s.startsWith("studentsRecord/")) {
    return `/vtop/${s}`;
  }
  if (s.startsWith("/")) {
    return `/vtop/${s.replace(/^\/+/, "")}`;
  }

  return `/vtop/${s}`;
}

/**
 * Converts an existing HTML image element in the DOM to base64 data URI via canvas.
 */
export function imageElementToBase64(img: HTMLImageElement | null | undefined): string {
  if (!img) return "";
  try {
    if (!img.complete || img.naturalWidth === 0) {
      const src = img.getAttribute("src") || img.src || "";
      return fixBase64Image(src);
    }
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fixBase64Image(img.getAttribute("src") || img.src);
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    if (dataUrl && dataUrl.startsWith("data:image") && dataUrl.length > 100) {
      return dataUrl;
    }
    return fixBase64Image(img.getAttribute("src") || img.src);
  } catch {
    return fixBase64Image(img?.getAttribute("src") || img?.src);
  }
}

export function normalizeVtopImageUrl(url: string): string {
  if (!url || url.startsWith("data:image")) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const cleanPath = url.replace(/^\/?(vtop\/)?/, "");
  const origin =
    typeof window !== "undefined" && window.location.origin.includes("vit.ac.in")
      ? window.location.origin
      : typeof window !== "undefined" && window.location.hostname.includes("vtopcc")
      ? "https://vtopcc.vit.ac.in"
      : "https://vtop.vit.ac.in";
  return `${origin}/vtop/${cleanPath}`;
}

/**
 * Fetch image from endpoint and convert to base64 data URI for offline caching.
 */
export async function urlToBase64(url: string): Promise<string> {
  if (!url || typeof window === "undefined") return "";
  if (url.startsWith("data:image")) return url;
  try {
    const fullUrl = normalizeVtopImageUrl(url);
    const res = await window.fetch(fullUrl, { credentials: "include" });
    if (!res.ok) return "";
    const blob = await res.blob();
    if (!blob || blob.size < 50) return "";
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const str = (reader.result as string) || "";
        resolve(str.startsWith("data:image") ? str : "");
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
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

export function parseStudentProfile(html: string): Versioned<StudentProfile> {
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

  return validateParsed(
    StudentProfileSchema,
    {
      basic,
      personal,
      currentAddress,
      permanentAddress,
      education,
      family,
      proctor,
      hostel,
    },
    "profile",
  );
}
