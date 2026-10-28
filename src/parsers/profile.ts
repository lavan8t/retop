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
} from '../types/vtop';
import {
  parseHTMLFast,
  validateParsed,
  Versioned,
} from '../utils/parser-utils';
import {
  cleanHostelField,
  parseHostelDetailsString,
} from '../utils/hostelFormat';

export const PROFILE_SCHEMA_VERSION = 1;

export function fixBase64Image(src: string | null | undefined): string {
  if (!src) return '';
  const s = src.trim();
  if (s.startsWith('data:') && (s.length < 50 || s.endsWith('base64,')))
    return '';
  if (s.startsWith('data:null;base64')) {
    return s.replace('data:null;base64', 'data:image/jpeg;base64');
  }
  if (s.startsWith('data:jpg;base64')) {
    return s.replace('data:jpg;base64', 'data:image/jpeg;base64');
  }
  if (s.startsWith('data:image')) return s;

  // 1. Raw Base64 image payload (JPEG starts with /9j, PNG starts with iVBORw0KGgo, GIF with R0lGOD, WebP with UklGR)
  const clean = s.replace(/\s+/g, '');
  if (
    clean.startsWith('/9j/') ||
    clean.startsWith('/9j') ||
    clean.startsWith('iVBORw0KGgo') ||
    clean.startsWith('R0lGOD') ||
    clean.startsWith('UklGR')
  ) {
    const mime = clean.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${clean}`;
  }

  // Pure base64 alphanumeric string without server paths
  if (
    clean.length > 80 &&
    /^[A-Za-z0-9+/=]+$/.test(clean) &&
    !clean.includes('users/image') &&
    !clean.includes('vtop') &&
    !clean.includes('process/')
  ) {
    return `data:image/jpeg;base64,${clean}`;
  }

  // 2. Standard web URLs & blob URIs
  if (
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('blob:')
  )
    return s;

  // 3. Server relative paths
  if (s.startsWith('/vtop/')) return s;
  if (
    s.startsWith('users/image') ||
    s.startsWith('process/') ||
    s.startsWith('studentsRecord/')
  ) {
    return `/vtop/${s}`;
  }
  if (s.startsWith('/')) {
    return `/vtop/${s.replace(/^\/+/, '')}`;
  }

  return `/vtop/${s}`;
}

/**
 * Converts an existing HTML image element in the DOM to base64 data URI via canvas.
 */
export function imageElementToBase64(
  img: HTMLImageElement | null | undefined,
): string {
  if (!img) return '';
  try {
    if (!img.complete || img.naturalWidth === 0) {
      const src = img.getAttribute('src') || img.src || '';
      return fixBase64Image(src);
    }
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return fixBase64Image(img.getAttribute('src') || img.src);
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    if (dataUrl && dataUrl.startsWith('data:image') && dataUrl.length > 100) {
      return dataUrl;
    }
    return fixBase64Image(img.getAttribute('src') || img.src);
  } catch {
    return fixBase64Image(img?.getAttribute('src') || img?.src);
  }
}

/**
 * True when an image src belongs to the student rather than to faculty.
 *
 * VTOP's profile page falls back to the student's own photo in the proctor
 * section, either as an identifiable `studentPhoto` path or — when it is inlined
 * — as the byte-identical data URI that belongs to the student. Both have to be
 * caught, otherwise the proctor card shows the student's face.
 */
export function isStudentPhotoSrc(
  src: string | null | undefined,
  studentPhotoUrl?: string | null,
): boolean {
  if (!src) return false;
  const lower = src.toLowerCase();
  if (lower.includes('studentphoto') || lower.includes('users/image/student')) {
    return true;
  }
  // Byte-identical inline copy. Short strings are ignored so two unrelated empty
  // placeholders do not collide.
  if (
    studentPhotoUrl &&
    studentPhotoUrl.length > 40 &&
    src === studentPhotoUrl
  ) {
    return true;
  }
  return false;
}

/**
 * Downloads the real proctor photo when the profile HTML did not carry one.
 *
 * The parser cannot do this: it is synchronous and its result is cached. Mirrors
 * the VTOP client's staffPhoto endpoint, which is the only source for faculty
 * images. Leaves the parsed value untouched on any failure, so a network blip
 * never costs the proctor's other fields.
 */
export async function resolveProctorPhoto<
  T extends {
    basic?: { photoUrl?: string } | null;
    proctor?: ProfileProctor | null;
  },
>(profile: T): Promise<T> {
  const proctor = profile?.proctor;
  if (!proctor) return profile;

  const current = proctor.photoUrl || '';
  const isStudentPhoto = isStudentPhotoSrc(current, profile.basic?.photoUrl);

  // Already a real inline faculty image: nothing to do.
  if (
    !isStudentPhoto &&
    current.startsWith('data:image') &&
    current.length > 100
  ) {
    return profile;
  }

  const id = proctor.id || '';
  const candidates: string[] = [];

  if (!isStudentPhoto && current && current !== fixBase64Image(current)) {
    // A server path or absolute URL, not an inline image.
    candidates.push(current);
  }
  if (id) {
    candidates.push(`${STAFF_PHOTO_PATH}?id=${encodeURIComponent(id)}`);
  }
  if (!candidates.length) {
    return { ...profile, proctor: { ...proctor, photoUrl: '' } };
  }

  for (const candidate of candidates) {
    const dataUri = await fetchImageAsDataUri(candidate);
    if (dataUri) {
      return { ...profile, proctor: { ...proctor, photoUrl: dataUri } };
    }
  }

  return { ...profile, proctor: { ...proctor, photoUrl: '' } };
}

const STAFF_PHOTO_PATH = 'users/image/staffPhoto';

async function fetchImageAsDataUri(pathOrUrl: string): Promise<string> {
  if (typeof window === 'undefined') return '';
  try {
    const url = normalizeVtopImageUrl(pathOrUrl);
    const res = await window.fetch(url, {
      credentials: 'include',
      // VTOP rejects image requests that do not look like they came from the
      // profile page.
      headers: {
        Referer: `${new URL(url).origin}/vtop/studentsRecord/StudentProfileAllView`,
      },
    });
    if (!res.ok) return '';

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return '';

    const blob = await res.blob();
    // VTOP answers with a 1x1 or truncated placeholder instead of 404.
    if (!blob || blob.size < 100) return '';

    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const str = (reader.result as string) || '';
        resolve(str.startsWith('data:image') ? str : '');
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

export function normalizeVtopImageUrl(url: string): string {
  if (!url || url.startsWith('data:image')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const cleanPath = url.replace(/^\/?(vtop\/)?/, '');
  const origin =
    typeof window !== 'undefined' &&
    window.location.origin.includes('vit.ac.in')
      ? window.location.origin
      : typeof window !== 'undefined' &&
          window.location.hostname.includes('vtopcc')
        ? 'https://vtopcc.vit.ac.in'
        : 'https://vtop.vit.ac.in';
  return `${origin}/vtop/${cleanPath}`;
}

/**
 * Fetch image from endpoint and convert to base64 data URI for offline caching.
 */
export async function urlToBase64(url: string): Promise<string> {
  if (!url || typeof window === 'undefined') return '';
  if (url.startsWith('data:image')) return url;
  try {
    const fullUrl = normalizeVtopImageUrl(url);
    const res = await window.fetch(fullUrl, { credentials: 'include' });
    if (!res.ok) return '';
    const blob = await res.blob();
    if (!blob || blob.size < 50) return '';
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const str = (reader.result as string) || '';
        resolve(str.startsWith('data:image') ? str : '');
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

function cleanText(text: string | undefined | null): string {
  if (!text) return '';
  return text.replace(/:/g, '').replace(/\s+/g, ' ').trim();
}

function parseSectionMap(
  doc: Document,
  sectionId: string,
  sectionIndex?: number,
): Map<string, string> {
  const map = new Map<string, string>();
  let container = doc.querySelector(`#${sectionId}, [id*='${sectionId}' i]`);
  if (!container && sectionIndex !== undefined) {
    const accordions = doc.querySelectorAll(
      '.accordion-item, .card, .panel, .collapse, .accordion .card-body, table.table',
    );
    if (accordions[sectionIndex]) {
      container = accordions[sectionIndex];
    }
  }
  if (!container) return map;

  const rows = container.querySelectorAll('tr');
  let currentContext = 'MAIN';

  rows.forEach((row) => {
    const cells = row.querySelectorAll('td, th');

    // Detect Context Headers (e.g., CURRENT ADDRESS, FATHER DETAILS)
    if (
      cells.length === 1 &&
      (cells[0].hasAttribute('colspan') ||
        cells[0].tagName.toLowerCase() === 'th')
    ) {
      const headerText = cleanText(cells[0].textContent).toUpperCase();
      if (headerText) currentContext = headerText;
      return;
    }

    // Extract Key-Value Pairs
    if (cells.length >= 2) {
      for (let i = 0; i < cells.length - 1; i += 2) {
        const key = cleanText(cells[i].textContent).toUpperCase();
        const val = cleanText(cells[i + 1]?.textContent);
        if (key) {
          map.set(`${currentContext}_${key}`, val);
          map.set(`MAIN_${key}`, val);
        }
      }
    }
  });

  return map;
}

export function parseStudentProfile(html: string): Versioned<StudentProfile> {
  const doc = parseHTMLFast(html);

  const basic: ProfileBasicInfo = {
    name:
      cleanText(
        doc.querySelector(
          '.col-4 p, .col-sm-4 p, .card p, h4, h5, .card-title, strong.text-primary',
        )?.textContent,
      ) || '',
    regNo: '',
    email: '',
    program: '',
    school: '',
    photoUrl: fixBase64Image(
      doc
        .querySelector(
          "img[src*='studentPhoto' i], img[src*='users/image' i], img[src*='StudentPhoto' i], .col-4 img, .card img, img",
        )
        ?.getAttribute('src'),
    ),
  };

  const labels = doc.querySelectorAll(
    'label, th, td strong, td b, .form-group, td',
  );
  labels.forEach((label) => {
    const text = cleanText(label.textContent).toUpperCase();
    const sibling =
      cleanText(label.nextElementSibling?.textContent) ||
      cleanText(
        label.parentElement?.querySelector(
          '.form-control-static, p, span, div:last-child',
        )?.textContent,
      );
    if (
      !basic.regNo &&
      (text.includes('REGISTER NUMBER') ||
        text.includes('REGISTRATION NUMBER') ||
        text.includes('REG NO') ||
        text.includes('REG. NO')) &&
      sibling
    ) {
      basic.regNo = sibling;
    }
    if (
      !basic.email &&
      (text.includes('VIT EMAIL') ||
        text.includes('OFFICIAL EMAIL') ||
        text.includes('INSTITUTIONAL EMAIL')) &&
      sibling
    ) {
      basic.email = sibling;
    }
    if (
      !basic.program &&
      (text.includes('PROGRAM') ||
        text.includes('PROGRAMME') ||
        text.includes('DEGREE')) &&
      sibling
    ) {
      basic.program = sibling;
    }
    if (
      !basic.school &&
      (text.includes('SCHOOL NAME') || text.includes('SCHOOL')) &&
      sibling
    ) {
      basic.school = sibling;
    }
  });

  const pMap = parseSectionMap(doc, 'collapseOne', 0);
  if (!basic.regNo)
    basic.regNo =
      pMap.get('MAIN_REGISTER NUMBER') ||
      pMap.get('MAIN_REGISTRATION NUMBER') ||
      pMap.get('MAIN_REG NO') ||
      '';
  if (!basic.name)
    basic.name =
      pMap.get('MAIN_STUDENT NAME') ||
      pMap.get('MAIN_NAME') ||
      pMap.get("MAIN_STUDENT'S NAME") ||
      '';
  if (!basic.email)
    basic.email = pMap.get('MAIN_VIT EMAIL') || pMap.get('MAIN_EMAIL') || '';
  if (!basic.program)
    basic.program =
      pMap.get('MAIN_PROGRAM') || pMap.get('MAIN_PROGRAMME') || '';
  if (!basic.school)
    basic.school =
      pMap.get('MAIN_SCHOOL NAME') || pMap.get('MAIN_SCHOOL') || '';

  const personal: ProfilePersonal = {
    appNo: pMap.get('MAIN_APPLICATION NUMBER') || pMap.get('MAIN_APP NO') || '',
    dob: pMap.get('MAIN_DATE OF BIRTH') || pMap.get('MAIN_DOB') || '',
    gender: pMap.get('MAIN_GENDER') || pMap.get('MAIN_SEX') || '',
    bloodGroup: pMap.get('MAIN_BLOOD GROUP') || pMap.get('MAIN_BLOOD') || '',
    community: pMap.get('MAIN_COMMUNITY') || '',
    caste: pMap.get('MAIN_CASTE') || '',
    religion: pMap.get('MAIN_RELIGION') || '',
    nationality: pMap.get('MAIN_NATIONALITY') || '',
    nativeState: pMap.get('MAIN_NATIVE STATE') || pMap.get('MAIN_STATE') || '',
    nativeLanguage:
      pMap.get('MAIN_NATIVE LANGUAGE') || pMap.get('MAIN_MOTHER TONGUE') || '',
    physicallyChallenged: pMap.get('MAIN_PHYSICALLY CHALLENGED') || 'NO',
    aadhar: pMap.get('MAIN_AADHAR NUMBER') || pMap.get('MAIN_AADHAR') || '',
    mobile: pMap.get('MAIN_MOBILE NUMBER') || pMap.get('MAIN_MOBILE') || '',
    email:
      pMap.get('PERMANENT ADDRESS_EMAIL') ||
      pMap.get('CURRENT ADDRESS_EMAIL') ||
      pMap.get('MAIN_EMAIL') ||
      '',
  };

  const currentAddress: Address = {
    street:
      pMap.get('CURRENT ADDRESS_STREET NAME') ||
      pMap.get('CURRENT ADDRESS_STREET') ||
      '',
    area:
      pMap.get('CURRENT ADDRESS_AREA NAME') ||
      pMap.get('CURRENT ADDRESS_AREA') ||
      '',
    city:
      pMap.get('CURRENT ADDRESS_CITY') ||
      pMap.get('CURRENT ADDRESS_DISTRICT') ||
      '',
    state: pMap.get('CURRENT ADDRESS_STATE') || '',
    country: pMap.get('CURRENT ADDRESS_COUNTRY') || '',
    pincode:
      pMap.get('CURRENT ADDRESS_PINCODE') ||
      pMap.get('CURRENT ADDRESS_ZIPCODE') ||
      '',
    phone:
      pMap.get('CURRENT ADDRESS_PHONE NUMBER[LAND LINE]') ||
      pMap.get('CURRENT ADDRESS_PHONE') ||
      '',
  };

  const permanentAddress: Address = {
    street:
      pMap.get('PERMANENT ADDRESS_STREET NAME') ||
      pMap.get('PERMANENT ADDRESS_STREET') ||
      '',
    area:
      pMap.get('PERMANENT ADDRESS_AREA NAME') ||
      pMap.get('PERMANENT ADDRESS_AREA') ||
      '',
    city:
      pMap.get('PERMANENT ADDRESS_CITY') ||
      pMap.get('PERMANENT ADDRESS_DISTRICT') ||
      '',
    state: pMap.get('PERMANENT ADDRESS_STATE') || '',
    country: pMap.get('PERMANENT ADDRESS_COUNTRY') || '',
    pincode:
      pMap.get('PERMANENT ADDRESS_PINCODE') ||
      pMap.get('PERMANENT ADDRESS_ZIPCODE') ||
      '',
    phone:
      pMap.get('PERMANENT ADDRESS_PHONE NUMBER[LAND LINE]') ||
      pMap.get('PERMANENT ADDRESS_PHONE') ||
      '',
  };

  const eMap = parseSectionMap(doc, 'collapseTwo', 1);
  const education: ProfileEducation = {
    degree:
      eMap.get('MAIN_APPLIED DEGREE') ||
      eMap.get('MAIN_DEGREE') ||
      basic.program ||
      '',
    qualification:
      eMap.get('MAIN_EDUCATIONAL QUALIFICATION') ||
      eMap.get('MAIN_QUALIFICATION') ||
      '',
    branch:
      eMap.get('MAIN_BRANCH / GROUP STUDIED') || eMap.get('MAIN_BRANCH') || '',
    school: eMap.get('MAIN_SCHOOL NAME') || eMap.get('MAIN_COLLEGE NAME') || '',
    medium: eMap.get('MAIN_MEDIUM OF STUDY') || eMap.get('MAIN_MEDIUM') || '',
    board: eMap.get('MAIN_BOARD / UNIVERSITY') || eMap.get('MAIN_BOARD') || '',
    regNo:
      eMap.get('MAIN_REGISTER NO/ ROLL NO') || eMap.get('MAIN_ROLL NO') || '',
    classObtained:
      eMap.get('MAIN_CLASS OBTAINED') || eMap.get('MAIN_CLASS') || '',
    year:
      eMap.get('MAIN_YEAR OF PASSING/ PASSED') || eMap.get('MAIN_YEAR') || '',
    month:
      eMap.get('MAIN_MONTH OF PASSING/ PASSED') || eMap.get('MAIN_MONTH') || '',
    breakInStudy:
      eMap.get('SCHOOL / COLLEGE ADDRESS_BREAK IN STUDY') ||
      eMap.get('MAIN_BREAK IN STUDY') ||
      'NO',
    breakReason:
      eMap.get('SCHOOL / COLLEGE ADDRESS_REASON') ||
      eMap.get('MAIN_REASON') ||
      '-',
    address: {
      street: '',
      area:
        eMap.get('SCHOOL / COLLEGE ADDRESS_AREA NAME') ||
        eMap.get('SCHOOL / COLLEGE ADDRESS_AREA') ||
        '',
      city:
        eMap.get('SCHOOL / COLLEGE ADDRESS_CITY / DISTRICT NAME') ||
        eMap.get('SCHOOL / COLLEGE ADDRESS_CITY') ||
        '',
      state:
        eMap.get('SCHOOL / COLLEGE ADDRESS_STATE NAME') ||
        eMap.get('SCHOOL / COLLEGE ADDRESS_STATE') ||
        '',
      country: '',
      pincode:
        eMap.get('SCHOOL / COLLEGE ADDRESS_PINCODE / ZIPCODE') ||
        eMap.get('SCHOOL / COLLEGE ADDRESS_PINCODE') ||
        '',
      phone:
        eMap.get('SCHOOL / COLLEGE ADDRESS_PHONE NUMBER[LAND LINE]') ||
        eMap.get('SCHOOL / COLLEGE ADDRESS_PHONE') ||
        '',
    },
  };

  const fMap = parseSectionMap(doc, 'collapseThree', 2);
  const getFamilyMember = (prefix: string): ProfileFamilyMember => ({
    name:
      fMap.get(`${prefix}_FATHER NAME`) ||
      fMap.get(`${prefix}_MOTHER NAME`) ||
      fMap.get(`${prefix}_NAME`) ||
      fMap.get(`${prefix}_PARENT NAME`) ||
      '',
    qualification: fMap.get(`${prefix}_QUALIFICATION`) || '',
    occupation: fMap.get(`${prefix}_OCCUPATION`) || '',
    organization: fMap.get(`${prefix}_ORGANIZATION`) || '',
    designation: fMap.get(`${prefix}_DESIGNATION`) || '',
    mobile:
      fMap.get(`${prefix}_MOBILE NUMBER`) || fMap.get(`${prefix}_MOBILE`) || '',
    email: fMap.get(`${prefix}_EMAIL`) || fMap.get(`${prefix}_EMAIL ID`) || '',
    income:
      fMap.get(`${prefix}_ANNUAL INCOME`) || fMap.get(`${prefix}_INCOME`) || '',
    address: {
      street:
        fMap.get(`${prefix}_STREET`) ||
        fMap.get(`${prefix}_OFFICIAL ADDRESS(STREET NAME)`) ||
        '',
      area:
        fMap.get(`${prefix}_OFFICIAL ADDRESS(AREA NAME)`) ||
        fMap.get(`${prefix}_AREA`) ||
        '',
      city:
        fMap.get(`${prefix}_CITY/DISTRICT`) ||
        fMap.get(`${prefix}_CITY`) ||
        fMap.get(`${prefix}_DISTRICT`) ||
        '',
      state: fMap.get(`${prefix}_STATE`) || '',
      country: '',
      pincode:
        fMap.get(`${prefix}_PINCODE/ZIPCODE`) ||
        fMap.get(`${prefix}_PINCODE`) ||
        fMap.get(`${prefix}_ZIPCODE`) ||
        '',
      phone:
        fMap.get(`${prefix}_PHONE NUMBER[LAND LINE]`) ||
        fMap.get(`${prefix}_PHONE`) ||
        '',
    },
  });

  const family: ProfileFamily = {
    brothers:
      fMap.get('MAIN_NO.OF.BROTHERS') || fMap.get('MAIN_BROTHERS') || '0',
    sisters: fMap.get('MAIN_NO.OF.SISTERS') || fMap.get('MAIN_SISTERS') || '0',
    studyingInVit: fMap.get('MAIN_IF BROTHER/SISTER STUDYING IN VIT') || 'NO',
    studyingDetails: fMap.get('MAIN_STUDYING DETAILS') || '-',
    studiedInVit: fMap.get('MAIN_IF BROTHER/SISTER STUDIED IN VIT') || 'NO',
    studiedDetails: fMap.get('MAIN_STUDIED DETAILS') || '-',
    father: getFamilyMember('FATHER DETAILS'),
    mother: getFamilyMember('MOTHER DETAILS'),
    guardian:
      fMap.get('FATHER DETAILS_GUARDIAN INFO') ||
      fMap.get('MOTHER DETAILS_GUARDIAN INFO') ||
      fMap.get('MAIN_GUARDIAN NAME') ||
      'PARENT',
    friendMobile:
      pMap.get('PERMANENT ADDRESS_FRIEND MOBILE NUMBER') ||
      pMap.get('MAIN_FRIEND MOBILE NUMBER') ||
      '',
  };

  const procMap = parseSectionMap(doc, 'collapseFour', 3);
  const proctorImgEl =
    doc.querySelector("#collapseFour img, [id*='collapseFour' i] img") ||
    doc.querySelector(
      "img[src*='faculty' i], img[src*='staffPhoto' i], img[src*='staff' i], img[src*='emp' i]",
    );
  const rawProctorSrc = proctorImgEl?.getAttribute('src') || undefined;

  const proctor: ProfileProctor = {
    id:
      procMap.get('MAIN_FACULTY ID') ||
      procMap.get('MAIN_STAFF ID') ||
      procMap.get('MAIN_ID') ||
      '',
    name:
      procMap.get('MAIN_FACULTY NAME') ||
      procMap.get('MAIN_PROCTOR NAME') ||
      procMap.get('MAIN_NAME') ||
      '',
    designation:
      procMap.get('MAIN_FACULTY DESIGNATION') ||
      procMap.get('MAIN_DESIGNATION') ||
      '',
    school: procMap.get('MAIN_SCHOOL') || procMap.get('MAIN_SCHOOL NAME') || '',
    cabin:
      procMap.get('MAIN_CABIN') ||
      procMap.get('MAIN_CABIN NO.') ||
      procMap.get('MAIN_ROOM NO.') ||
      '',
    dept:
      procMap.get('MAIN_FACULTY DEPARTMENT') ||
      procMap.get('MAIN_DEPARTMENT') ||
      procMap.get('MAIN_DEPT') ||
      '',
    email:
      procMap.get('MAIN_FACULTY EMAIL') ||
      procMap.get('MAIN_EMAIL') ||
      procMap.get('MAIN_EMAIL ID') ||
      '',
    mobile:
      procMap.get('MAIN_FACULTY MOBILE NUMBER') ||
      procMap.get('MAIN_MOBILE NUMBER') ||
      procMap.get('MAIN_MOBILE') ||
      procMap.get('MAIN_PHONE') ||
      '',
    // VTOP reuses the student's own photo inside the proctor section whenever the
    // faculty has no image on file. Rendering that as the proctor is worse than
    // rendering nothing, so drop it here and let resolveProctorPhoto re-fetch.
    photoUrl: isStudentPhotoSrc(rawProctorSrc, basic.photoUrl)
      ? ''
      : fixBase64Image(rawProctorSrc),
  };

  const hMap = parseSectionMap(doc, 'collapseFive', 4);
  let hostel: ProfileHostel | null = null;
  const hostelContainer = doc.querySelector(
    "#collapseFive, [id*='collapseFive' i]",
  );
  const hostelNotFound =
    hostelContainer?.textContent?.toUpperCase().includes('NOT FOUND') ||
    hostelContainer?.textContent?.toUpperCase().includes('DAY SCHOLAR') ||
    hMap.size === 0;

  if (!hostelNotFound && hMap.size > 0) {
    // Some VTOP builds pack the whole residence block into one cell instead of
    // separate rows, so recover what the key/value map could not.
    const packed = [
      'MAIN_HOSTEL DETAILS',
      'MAIN_HOSTEL DETAIL',
      'MAIN_HOSTEL INFORMATION',
      'MAIN_HOSTEL',
      'MAIN_RESIDENCE DETAILS',
    ]
      .map((key) => hMap.get(key) || '')
      .find((value) => value.length > 0);
    const fromPacked = parseHostelDetailsString(packed);
    // Unlabelled packed text is still useful when it is VTOP's block string.
    const packedBlock =
      fromPacked.block ||
      (packed && Object.keys(fromPacked).length === 0 ? packed : '');

    const mess =
      hMap.get('MAIN_MESS INFORMATION') ||
      hMap.get('MAIN_MESS TYPE') ||
      hMap.get('MAIN_MESS') ||
      hMap.get('MAIN_MESS NAME') ||
      hMap.get('MAIN_FOOD TYPE') ||
      fromPacked.mess ||
      '';
    const caterer =
      hMap.get('MAIN_CATERER') ||
      hMap.get('MAIN_CATERER NAME') ||
      fromPacked.caterer ||
      '';
    const messLine =
      mess && caterer && !mess.toLowerCase().includes(caterer.toLowerCase())
        ? `${mess} - ${caterer}`
        : mess;

    hostel = {
      appNo:
        hMap.get('MAIN_APPLICATION NUMBER') || hMap.get('MAIN_APP NO') || '',
      regNo:
        hMap.get('MAIN_REGISTER NUMBER') ||
        hMap.get('MAIN_REG NO') ||
        basic.regNo ||
        '',
      block: cleanHostelField(
        hMap.get('MAIN_BLOCK NAME') ||
          hMap.get('MAIN_BLOCK') ||
          hMap.get('MAIN_HOSTEL BLOCK') ||
          hMap.get('MAIN_HOSTEL BLOCK NAME') ||
          packedBlock,
      ),
      room: cleanHostelField(
        hMap.get('MAIN_ROOM NO.') ||
          hMap.get('MAIN_ROOM NO') ||
          hMap.get('MAIN_ROOM NUMBER') ||
          hMap.get('MAIN_ROOM') ||
          fromPacked.room,
      ),
      bedType: cleanHostelField(
        hMap.get('MAIN_BED TYPE') || hMap.get('MAIN_BED') || fromPacked.bedType,
      ),
      mess: cleanHostelField(messLine),
    };
  }

  return validateParsed(
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
    'profile',
  );
}
