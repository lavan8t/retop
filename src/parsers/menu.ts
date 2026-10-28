import { MenuCategory, QuickLink } from '../types/vtop';
import { fixBase64Image, imageElementToBase64 } from './profile';
import { validateParsed, Versioned } from '../utils/parser-utils';

export const MENU_SCHEMA_VERSION = 1;

const MENU_TITLE_CANONICAL: Record<string, string> = {
  'class attendance': 'Attendance',
  'student attendance': 'Attendance',
  attendance: 'Attendance',
  'course page consolidated': 'Course Page',
  'course page (consolidated)': 'Course Page',
  'course page': 'Course Page',
  'student course page': 'Course Page',
  'digital assignment': 'Assignments',
  'digital assignment upload': 'Assignments',
  'student da': 'Assignments',
  studentda: 'Assignments',
  'grades view': 'Grades & History',
  'grade history': 'Grades & History',
  'grades & history': 'Grades & History',
  'grade view': 'Grades & History',
  'student grade view': 'Grades & History',
  'student grade history': 'Grades & History',
  grades: 'Grades & History',
  'student profile': 'Profile',
  'profile view': 'Profile',
  profile: 'Profile',
  'student profile all view': 'Profile',
  'marks view': 'Marks',
  'student marks': 'Marks',
  'student mark view': 'Marks',
  marks: 'Marks',
  timetable: 'Timetable',
  'time table': 'Timetable',
  'class timetable': 'Timetable',
  'student time table chn': 'Timetable',
  'student timetable': 'Timetable',
  'academic calendar': 'Calendar',
  'academics calendar': 'Calendar',
  calendar: 'Calendar',
  'calendar preview': 'Calendar',
  'exam schedule': 'Exam Schedule',
  'examinations schedule': 'Exam Schedule',
  'stud exam schedule': 'Exam Schedule',
  curriculum: 'Curriculum',
  'programme curriculum': 'Curriculum',
  'curriculum & syllabus': 'Curriculum',
  'my curriculum': 'Curriculum',
};

const sanitizeMenuTitle = (title: string, categoryTitle?: string): string => {
  let clean = title.trim();
  clean = clean
    .replace(/^[0-9]+[\.\)]\s*/, '')
    .replace(/^[-•›»:\*]+\s*/, '')
    .trim();

  if (categoryTitle) {
    clean = clean
      .replace(new RegExp(`^${categoryTitle}\\s*[-:/|]\\s*`, 'i'), '')
      .trim();
  }
  clean = clean
    .replace(
      /^(examinations|academics|general|services|reports|information|student)\s*[-:/|]\s*/i,
      '',
    )
    .trim();

  return MENU_TITLE_CANONICAL[clean.toLowerCase()] || clean;
};

// Helper to extract actionable URL from data attributes or onclick handlers
const extractUrlFromAnchor = (a: HTMLElement): string | null => {
  const dataUrl =
    a.getAttribute('data-url') ||
    a.getAttribute('data-href') ||
    a.getAttribute('data-action');
  if (
    dataUrl &&
    dataUrl !== '#' &&
    dataUrl !== 'null' &&
    !dataUrl.startsWith('javascript:') &&
    !dataUrl.startsWith('javacript:')
  ) {
    return dataUrl.trim();
  }

  const onclick = a.getAttribute('onclick') || '';
  if (onclick) {
    const match =
      onclick.match(
        /(?:ajaxCall|ajaxB5Call|ajaxDynamicTargetCall|loadMenu|loadPage|navigate)\s*\(\s*['"]([^'"]+)['"]/i,
      ) ||
      onclick.match(
        /['"]([a-zA-Z0-9_\-\/]+(?:Attendance|DA|Mark|Grade|TimeTable|Schedule|Profile|Curriculum|CoursePage|Details|View)[a-zA-Z0-9_\-\/]*)['"]/i,
      );
    if (match && match[1] && match[1] !== 'null') {
      return match[1].replace(/^\/vtop\//i, '').trim();
    }
  }

  const href = a.getAttribute('href') || '';
  if (
    href &&
    !href.startsWith('#') &&
    !href.startsWith('javascript:') &&
    !href.startsWith('javacript:') &&
    href !== 'void(0)' &&
    href !== 'null'
  ) {
    return href.replace(/^\/vtop\//i, '').trim();
  }

  return null;
};

const IGNORED_TITLES = new Set([
  '☰',
  'quick links',
  'official resources',
  'help center',
  'sign out',
  'login history',
  'print',
  'home',
  'close',
  'sorry !!!',
  'loading... please wait',
  'access denied',
  'temp',
]);

// Helper to clean and format title text
function cleanElementText(el: Element): string {
  let text = el.textContent || '';
  text = text.replace(/[\u00a0\s]+/g, ' ').trim();
  return text;
}

export function scrapeMenu(doc: Document): Versioned<MenuCategory[]> {
  const categories: MenuCategory[] = [];
  const visitedUrls = new Set<string>();

  // Strategy 1: Modern Bootstrap 5 Offcanvas / Expanded Sidebar (#expandedSideBar)
  const expandedSideBar = doc.getElementById('expandedSideBar');
  if (expandedSideBar) {
    // 1. Direct standalone anchors outside main accordion (e.g. Contact Us)
    const directStandaloneAnchors = expandedSideBar.querySelectorAll(
      ':scope > div > .menuFontStyle > a[data-url], :scope > .menuFontStyle > a[data-url]',
    );
    if (directStandaloneAnchors.length > 0) {
      const generalLinks: QuickLink[] = [];
      directStandaloneAnchors.forEach((a) => {
        const url = extractUrlFromAnchor(a as HTMLElement);
        const rawTitle = cleanElementText(a);
        const title = sanitizeMenuTitle(rawTitle);
        if (
          url &&
          title &&
          !IGNORED_TITLES.has(title.toLowerCase()) &&
          !visitedUrls.has(url)
        ) {
          visitedUrls.add(url);
          generalLinks.push({ title, url, category: 'General' });
        }
      });
      if (generalLinks.length > 0) {
        categories.push({
          id: 'category_general',
          title: 'General',
          links: generalLinks,
        });
      }
    }

    // 2. Main Accordion Items under #accordianMenuHead_1001 (or any top-level accordion-item)
    const topAccordionItems = expandedSideBar.querySelectorAll(
      '#accordianMenuHead_1001 > .accordion-item, .accordion > .accordion-item',
    );
    topAccordionItems.forEach((item, idx) => {
      const headerBtn = item.querySelector(':scope > .accordion-header button');
      if (!headerBtn) return;

      const categoryTitle = cleanElementText(
        headerBtn.querySelector('span.textColor1') || headerBtn,
      );
      if (!categoryTitle || IGNORED_TITLES.has(categoryTitle.toLowerCase()))
        return;

      const collapseContainer = item.querySelector(
        ':scope > .accordion-collapse',
      );
      if (!collapseContainer) return;

      const links: QuickLink[] = [];

      // Scan all anchors inside this category collapse
      const anchors = collapseContainer.querySelectorAll(
        'a[data-url], a[href]',
      );
      anchors.forEach((a) => {
        const url = extractUrlFromAnchor(a as HTMLElement);
        if (!url || visitedUrls.has(url)) return;

        // Check if this anchor lives inside a nested sub-accordion
        let subheading: string | undefined = undefined;
        const subAccordion = a.closest('.accordion-collapse');
        if (subAccordion && subAccordion !== collapseContainer) {
          const subHeaderBtn = subAccordion.parentElement?.querySelector(
            '.accordion-header button',
          );
          if (subHeaderBtn) {
            const subTitle = cleanElementText(
              subHeaderBtn.querySelector('span.textColor1') || subHeaderBtn,
            );
            if (subTitle && subTitle !== categoryTitle) {
              subheading = subTitle;
            }
          }
        }

        const rawTitle = cleanElementText(a);
        let title = sanitizeMenuTitle(rawTitle, categoryTitle);

        if (title && !IGNORED_TITLES.has(title.toLowerCase())) {
          visitedUrls.add(url);
          links.push({
            title,
            url,
            category: categoryTitle,
            subheading,
          });
        }
      });

      if (links.length > 0) {
        categories.push({
          id: `category_${idx}_${categoryTitle.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          title: categoryTitle,
          links,
        });
      }
    });
  }

  // Strategy 2: Left Side Icon Toolbar (#sidePanel .SideBarMenuDropDown)
  if (categories.length === 0) {
    const sidePanelDropdowns = doc.querySelectorAll(
      '#sidePanel .btn-group.dropend',
    );
    sidePanelDropdowns.forEach((group, idx) => {
      const dropdownMenu = group.querySelector('.SideBarMenuDropDown');
      if (!dropdownMenu) return;

      const headerElem = dropdownMenu.querySelector(
        '.menuHeaderFontStyle, .menuHeaderColor, .h6, h5',
      );
      let categoryTitle = headerElem ? cleanElementText(headerElem) : '';

      const anchors = dropdownMenu.querySelectorAll('a[data-url], a[href]');
      const links: QuickLink[] = [];

      anchors.forEach((a) => {
        const url = extractUrlFromAnchor(a as HTMLElement);
        if (!url || visitedUrls.has(url)) return;

        const rawTitle = cleanElementText(a);
        const title = sanitizeMenuTitle(rawTitle, categoryTitle);

        if (title && !IGNORED_TITLES.has(title.toLowerCase())) {
          visitedUrls.add(url);
          links.push({
            title,
            url,
            category: categoryTitle || 'General',
          });
        }
      });

      if (links.length > 0) {
        if (!categoryTitle && links.length === 1) {
          categoryTitle = links[0].title;
        }
        categoryTitle = categoryTitle || `Category ${idx + 1}`;
        categories.push({
          id: `side_cat_${idx}`,
          title: categoryTitle,
          links,
        });
      }
    });
  }

  // Strategy 3: Horizontal navbar / Legacy (#top-hmenu-bar / a.hmenuItem)
  if (categories.length === 0) {
    const categoryAnchors = doc.querySelectorAll(
      "#top-hmenu-bar a.hmenuItem, #top-hmenu-bar a.hmenuitem, a.hmenuItem, a.hmenuitem, #top-hmenu-bar a[data-bs-toggle='collapse'][href^='#MG'], a[href^='#MG']",
    );
    const seenCategoryIds = new Set<string>();

    categoryAnchors.forEach((categoryAnchor) => {
      const href = categoryAnchor.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const containerId = href.substring(1);
      if (seenCategoryIds.has(containerId)) return;

      const container = doc.getElementById(containerId);
      if (!container) return;

      // Extract title from category header or anchor text
      let title = cleanElementText(categoryAnchor);
      if (!title || title === '☰') {
        const headerInside = container.querySelector(
          '.fw-bold.h5, .h5, .card-header',
        );
        if (headerInside) {
          title = cleanElementText(headerInside);
        }
      }

      if (!title || IGNORED_TITLES.has(title.toLowerCase())) return;
      seenCategoryIds.add(containerId);

      const links: QuickLink[] = [];

      // Scan through all list-groups or sections inside the container
      const listGroups = container.querySelectorAll('.list-group');
      if (listGroups.length > 0) {
        listGroups.forEach((group) => {
          let currentSubheading: string | undefined = undefined;
          const children = Array.from(group.children);

          children.forEach((child) => {
            // Check if this child is a section title header (e.g. "General", "Proctor", "Course Registration")
            if (
              child.classList.contains('card-title') ||
              child.classList.contains('card-header') ||
              child.querySelector('.card-title, .card-header') ||
              (child.tagName === 'DIV' &&
                child.classList.contains('list-group-item') &&
                !child.hasAttribute('data-url'))
            ) {
              const subTitle = cleanElementText(child);
              if (subTitle && !IGNORED_TITLES.has(subTitle.toLowerCase())) {
                currentSubheading = subTitle;
              }
              return;
            }

            // Check if child is an anchor or contains an anchor
            const anchor =
              child.tagName === 'A'
                ? (child as HTMLElement)
                : child.querySelector('a[data-url], a[href]');
            if (anchor) {
              const url = extractUrlFromAnchor(anchor as HTMLElement);
              if (!url || visitedUrls.has(url)) return;

              const rawTitle = cleanElementText(anchor);
              const linkTitle = sanitizeMenuTitle(rawTitle, title);

              if (linkTitle && !IGNORED_TITLES.has(linkTitle.toLowerCase())) {
                visitedUrls.add(url);
                links.push({
                  title: linkTitle,
                  url,
                  category: title,
                  subheading: currentSubheading,
                });
              }
            }
          });
        });
      } else {
        container.querySelectorAll('a').forEach((a) => {
          const url = extractUrlFromAnchor(a as HTMLElement);
          if (!url || visitedUrls.has(url)) return;

          const rawTitle = cleanElementText(a);
          const linkTitle = sanitizeMenuTitle(rawTitle, title);

          if (linkTitle && !IGNORED_TITLES.has(linkTitle.toLowerCase())) {
            visitedUrls.add(url);
            links.push({ title: linkTitle, url, category: title });
          }
        });
      }

      if (links.length > 0) {
        categories.push({ id: containerId, title, links });
      }
    });
  }

  return validateParsed(categories, 'menu');
}

export function scrapeUserProfile(doc: Document) {
  const authInput =
    (doc.getElementById('authorizedIDX') as HTMLInputElement)?.value ||
    (doc.getElementById('authorizedID') as HTMLInputElement)?.value ||
    '';

  const navText =
    doc
      .querySelector('.navbar-text.text-light.small.fw-bold')
      ?.textContent?.trim() ||
    doc.querySelector('#navbarDropdown .navbar-text')?.textContent?.trim() ||
    doc.querySelector('.navbar-text')?.textContent?.trim() ||
    '';

  // Clean tags like "(STUDENT)", "(FACULTY)", "(PARENT)", "(OFFLINE)"
  const clean = navText
    .replace(
      /\(STUDENT\)|\(FACULTY\)|\(PARENT\)|\(EMPLOYEE\)|\(ALUMNI\)|\(OFFLINE\)/gi,
      '',
    )
    .trim();
  const parts = clean
    .split('-')
    .map((s) => s.trim())
    .filter(Boolean);

  const rawRegNo = authInput || parts[0] || 'Student';
  const regNo = rawRegNo.replace(/\s*\(offline\)/gi, '').trim() || 'Student';
  const rawName =
    parts.length > 1
      ? parts.slice(1).join('-').trim()
      : parts[0] && parts[0] !== authInput
        ? parts[0]
        : '';
  const name =
    rawName
      .replace(/\s*\(offline\)/gi, '')
      .replace(/\)+$/, '')
      .trim() || regNo;

  const isChennai =
    (typeof window !== 'undefined' &&
      window.location.hostname.includes('vtopcc')) ||
    doc.title.toLowerCase().includes('chennai') ||
    doc.documentElement.innerHTML.includes('vtopcc');
  const campus: 'Chennai' | 'Vellore' = isChennai ? 'Chennai' : 'Vellore';

  let rawImg: string | undefined = undefined;

  const imgEl = (doc.querySelector('img#retop-profile-image-mock') ||
    doc.querySelector(
      '#vtop-header img.img_icon_size, #vtop-header img.img_stamp_size, #top-hmenu-bar img.img_icon_size, #top-hmenu-bar img.img_stamp_size',
    ) ||
    doc.querySelector(
      '.navbar-right img, #navbarDropdown img, #profileDropdown img, .profile-picture img',
    ) ||
    doc.querySelector(
      "img[src*='users/image'], img[src*='image/?id'], img[src*='StudentPhoto'], img[src*='studentPhoto'], img[src*='process/profilePhoto']",
    ) ||
    doc.querySelector(
      'img.img_icon_size, img.img_stamp_size, img.img-circle',
    )) as HTMLImageElement | null;

  if (imgEl) {
    const canvasBase64 = imageElementToBase64(imgEl);
    rawImg =
      canvasBase64 || imgEl.getAttribute('src') || imgEl.src || undefined;
  }

  if (!rawImg) {
    const allHeaderImgs = Array.from(
      doc.querySelectorAll(
        '#vtop-header img, #top-hmenu-bar img, header img, nav img, .navbar img',
      ),
    ) as HTMLImageElement[];
    for (const img of allHeaderImgs) {
      const src = img.getAttribute('src') || img.src;
      if (
        src &&
        !src.includes('vitLogo') &&
        !src.includes('logo') &&
        !src.includes('icon') &&
        !src.includes('retop')
      ) {
        const canvasBase64 = imageElementToBase64(img);
        rawImg = canvasBase64 || src;
        break;
      }
    }
  }

  const profileImgBase64 = fixBase64Image(rawImg) || undefined;

  return validateParsed({ name, regNo, profileImgBase64, campus }, 'menu');
}
