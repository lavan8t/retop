import { MenuCategory, QuickLink } from "../types/vtop";

const sanitizeMenuTitle = (title: string, categoryTitle?: string): string => {
  let clean = title.trim();

  // Strip leading numbers/bullets (e.g. "1. ", "• ", "- ", "› ")
  clean = clean.replace(/^[0-9]+[\.\)]\s*/, "").replace(/^[-•›»:\*]+\s*/, "").trim();

  // Remove redundant category prefix if present
  if (categoryTitle) {
    const catPattern = new RegExp(`^${categoryTitle}\\s*[-:/|]\\s*`, "i");
    clean = clean.replace(catPattern, "").trim();
  }

  // Remove common generic section prefixes
  clean = clean.replace(/^(examinations|academics|general|services|reports|information|student)\s*[-:/|]\s*/i, "").trim();

  const lower = clean.toLowerCase();

  if (
    lower === "class attendance" ||
    lower === "student attendance" ||
    lower === "attendance"
  ) {
    return "Attendance";
  }

  if (
    lower.includes("course page consolidated") ||
    lower.includes("course page (consolidated)") ||
    lower === "course page" ||
    lower === "student course page"
  ) {
    return "Course Page";
  }

  if (
    lower.includes("digital assignment") ||
    lower.includes("digital assignment upload") ||
    lower === "student da" ||
    lower === "studentda"
  ) {
    return "Assignments";
  }

  if (
    lower === "grades view" ||
    lower === "grade history" ||
    lower === "grades & history" ||
    lower === "grade view" ||
    lower === "student grade view" ||
    lower === "student grade history" ||
    lower === "grades"
  ) {
    return "Grades & History";
  }

  if (
    lower === "student profile" ||
    lower === "profile view" ||
    lower === "profile" ||
    lower === "student profile all view"
  ) {
    return "Profile";
  }

  if (
    lower === "marks view" ||
    lower === "student marks" ||
    lower === "student mark view" ||
    lower === "marks"
  ) {
    return "Marks";
  }

  if (
    lower === "timetable" ||
    lower === "time table" ||
    lower === "class timetable" ||
    lower === "student time table chn" ||
    lower === "student timetable"
  ) {
    return "Timetable";
  }

  if (
    lower === "academic calendar" ||
    lower === "academics calendar" ||
    lower === "calendar" ||
    lower === "calendar preview"
  ) {
    return "Calendar";
  }

  if (
    lower === "exam schedule" ||
    lower === "examinations schedule" ||
    lower === "stud exam schedule"
  ) {
    return "Exam Schedule";
  }

  if (
    lower === "curriculum" ||
    lower === "programme curriculum" ||
    lower === "curriculum & syllabus" ||
    lower === "my curriculum"
  ) {
    return "Curriculum";
  }

  return clean;
};

// Helper to extract actionable URL from data attributes or onclick handlers
const extractUrlFromAnchor = (a: HTMLElement): string | null => {
  const dataUrl = a.getAttribute("data-url") || a.getAttribute("data-href") || a.getAttribute("data-action");
  if (dataUrl && dataUrl !== "#" && dataUrl !== "null" && !dataUrl.startsWith("javascript:") && !dataUrl.startsWith("javacript:")) {
    return dataUrl.trim();
  }

  const onclick = a.getAttribute("onclick") || "";
  if (onclick) {
    const match =
      onclick.match(/(?:ajaxCall|ajaxB5Call|ajaxDynamicTargetCall|loadMenu|loadPage|navigate)\s*\(\s*['"]([^'"]+)['"]/i) ||
      onclick.match(/['"]([a-zA-Z0-9_\-\/]+(?:Attendance|DA|Mark|Grade|TimeTable|Schedule|Profile|Curriculum|CoursePage|Details|View)[a-zA-Z0-9_\-\/]*)['"]/i);
    if (match && match[1] && match[1] !== "null") {
      return match[1].replace(/^\/vtop\//i, "").trim();
    }
  }

  const href = a.getAttribute("href") || "";
  if (href && !href.startsWith("#") && !href.startsWith("javascript:") && !href.startsWith("javacript:") && href !== "void(0)" && href !== "null") {
    return href.replace(/^\/vtop\//i, "").trim();
  }

  return null;
};

const IGNORED_TITLES = new Set([
  "☰",
  "quick links",
  "official resources",
  "help center",
  "sign out",
  "login history",
  "print",
  "home",
  "close",
  "sorry !!!",
  "loading... please wait",
  "access denied",
  "temp",
]);

// Helper to clean and format title text
function cleanElementText(el: Element): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".retop-menu-badge, .badge, .label, i, svg, small, b.header, span.header, span.sub-header, .dropdown-header").forEach((b) => b.remove());
  let text = clone.textContent || "";
  text = text.replace(/[\u00a0\s]+/g, " ").trim();
  return text;
}

export function scrapeMenu(doc: Document): MenuCategory[] {
  const categories: MenuCategory[] = [];
  const visitedUrls = new Set<string>();

  // Strategy 1: Modern Bootstrap 5 Offcanvas / Expanded Sidebar (#expandedSideBar)
  const expandedSideBar = doc.getElementById("expandedSideBar");
  if (expandedSideBar) {
    // 1. Direct standalone anchors outside main accordion (e.g. Contact Us)
    const directStandaloneAnchors = expandedSideBar.querySelectorAll(":scope > div > .menuFontStyle > a[data-url], :scope > .menuFontStyle > a[data-url]");
    if (directStandaloneAnchors.length > 0) {
      const generalLinks: QuickLink[] = [];
      directStandaloneAnchors.forEach((a) => {
        const url = extractUrlFromAnchor(a as HTMLElement);
        const rawTitle = cleanElementText(a);
        const title = sanitizeMenuTitle(rawTitle);
        if (url && title && !IGNORED_TITLES.has(title.toLowerCase()) && !visitedUrls.has(url)) {
          visitedUrls.add(url);
          generalLinks.push({ title, url, category: "General" });
        }
      });
      if (generalLinks.length > 0) {
        categories.push({ id: "category_general", title: "General", links: generalLinks });
      }
    }

    // 2. Main Accordion Items under #accordianMenuHead_1001 (or any top-level accordion-item)
    const topAccordionItems = expandedSideBar.querySelectorAll("#accordianMenuHead_1001 > .accordion-item, .accordion > .accordion-item");
    topAccordionItems.forEach((item, idx) => {
      const headerBtn = item.querySelector(":scope > .accordion-header button");
      if (!headerBtn) return;

      const categoryTitle = cleanElementText(headerBtn.querySelector("span.textColor1") || headerBtn);
      if (!categoryTitle || IGNORED_TITLES.has(categoryTitle.toLowerCase())) return;

      const collapseContainer = item.querySelector(":scope > .accordion-collapse");
      if (!collapseContainer) return;

      const links: QuickLink[] = [];

      // Scan all anchors inside this category collapse
      const anchors = collapseContainer.querySelectorAll("a[data-url], a[href]");
      anchors.forEach((a) => {
        const url = extractUrlFromAnchor(a as HTMLElement);
        if (!url || visitedUrls.has(url)) return;

        // Check if this anchor lives inside a nested sub-accordion
        let subheading: string | undefined = undefined;
        const subAccordion = a.closest(".accordion-collapse");
        if (subAccordion && subAccordion !== collapseContainer) {
          const subHeaderBtn = subAccordion.parentElement?.querySelector(".accordion-header button");
          if (subHeaderBtn) {
            const subTitle = cleanElementText(subHeaderBtn.querySelector("span.textColor1") || subHeaderBtn);
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
          id: `category_${idx}_${categoryTitle.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          title: categoryTitle,
          links,
        });
      }
    });
  }

  // Strategy 2: Left Side Icon Toolbar (#sidePanel .SideBarMenuDropDown)
  if (categories.length === 0) {
    const sidePanelDropdowns = doc.querySelectorAll("#sidePanel .btn-group.dropend");
    sidePanelDropdowns.forEach((group, idx) => {
      const dropdownMenu = group.querySelector(".SideBarMenuDropDown");
      if (!dropdownMenu) return;

      const headerElem = dropdownMenu.querySelector(".menuHeaderFontStyle, .menuHeaderColor, .h6, h5");
      let categoryTitle = headerElem ? cleanElementText(headerElem) : "";
      
      const anchors = dropdownMenu.querySelectorAll("a[data-url], a[href]");
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
            category: categoryTitle || "General",
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
      "#top-hmenu-bar a.hmenuItem, #top-hmenu-bar a.hmenuitem, a.hmenuItem, a.hmenuitem, #top-hmenu-bar a[data-bs-toggle='collapse'][href^='#MG'], a[href^='#MG']"
    );
    const seenCategoryIds = new Set<string>();

    categoryAnchors.forEach((categoryAnchor) => {
      const href = categoryAnchor.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      const containerId = href.substring(1);
      if (seenCategoryIds.has(containerId)) return;

      const container = doc.getElementById(containerId);
      if (!container) return;

      // Extract title from category header or anchor text
      let title = cleanElementText(categoryAnchor);
      if (!title || title === "☰") {
        const headerInside = container.querySelector(".fw-bold.h5, .h5, .card-header");
        if (headerInside) {
          title = cleanElementText(headerInside);
        }
      }

      if (!title || IGNORED_TITLES.has(title.toLowerCase())) return;
      seenCategoryIds.add(containerId);

      const links: QuickLink[] = [];

      // Scan through all list-groups or sections inside the container
      const listGroups = container.querySelectorAll(".list-group");
      if (listGroups.length > 0) {
        listGroups.forEach((group) => {
          let currentSubheading: string | undefined = undefined;
          const children = Array.from(group.children);

          children.forEach((child) => {
            // Check if this child is a section title header (e.g. "General", "Proctor", "Course Registration")
            if (
              child.classList.contains("card-title") ||
              child.classList.contains("card-header") ||
              child.querySelector(".card-title, .card-header") ||
              (child.tagName === "DIV" && child.classList.contains("list-group-item") && !child.hasAttribute("data-url"))
            ) {
              const subTitle = cleanElementText(child);
              if (subTitle && !IGNORED_TITLES.has(subTitle.toLowerCase())) {
                currentSubheading = subTitle;
              }
              return;
            }

            // Check if child is an anchor or contains an anchor
            const anchor = child.tagName === "A" ? (child as HTMLElement) : child.querySelector("a[data-url], a[href]");
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
        container.querySelectorAll("a").forEach((a) => {
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

  return categories;
}

export function scrapeUserProfile(doc: Document) {
  const navText =
    doc.querySelector(".navbar-text.text-light.small.fw-bold")?.textContent?.trim() ||
    doc.querySelector("#navbarDropdown .navbar-text")?.textContent?.trim() ||
    "";

  // Clean tags like "(STUDENT)", "(FACULTY)", "(PARENT)", "(OFFLINE)"
  const clean = navText.replace(/\(STUDENT\)|\(FACULTY\)|\(PARENT\)|\(EMPLOYEE\)|\(ALUMNI\)|\(OFFLINE\)/gi, "").trim();
  const parts = clean.split("-").map((s) => s.trim()).filter(Boolean);

  const authInput = (doc.getElementById("authorizedIDX") as HTMLInputElement)?.value;
  const rawRegNo = parts[0] || authInput || "Student";
  const regNo = rawRegNo.replace(/\s*\(offline\)/gi, "").trim();
  const rawName = parts[1] || regNo;
  const name = rawName.replace(/\s*\(offline\)/gi, "").replace(/\)+$/, "").trim();

  const isChennai =
    (typeof window !== "undefined" && window.location.hostname.includes("vtopcc")) ||
    doc.title.toLowerCase().includes("chennai") ||
    doc.documentElement.innerHTML.includes("vtopcc");
  const campus: "chennai" | "vellore" = isChennai ? "chennai" : "vellore";

  const rawImg =
    doc.querySelector("img#retop-profile-image-mock")?.getAttribute("src") ||
    doc.querySelector("img.img_icon_size, img.img_stamp_size")?.getAttribute("src") ||
    undefined;
  const profileImgBase64 = rawImg && rawImg.startsWith("data:image") ? rawImg : undefined;

  return { name, regNo, profileImgBase64, campus };
}
