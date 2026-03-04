import { MenuCategory, QuickLink } from "../types/vtop";

const sanitizeMenuTitle = (title: string): string => {
  const lowerTitle = title.toLowerCase();

  if (
    lowerTitle.includes("course page consolidated") ||
    lowerTitle === "course page"
  ) {
    return "Course Page";
  }

  return title;
};

export function scrapeMenu(doc: Document): MenuCategory[] {
  const categories: MenuCategory[] = [];
  const visitedUrls = new Set<string>();

  const idMap: Record<string, string> = {
    MG0001: "Academics",
    MG0002: "Examinations",
    MG0003: "Finance",
    MG0004: "Events",
    MG0015: "SAP/IR",
    MG0005: "Services",
    MG0009: "Hostels",
    MG0008: "Feedback",
    MG0010: "Library",
    MG0011: "Placement",
    MG0012: "Research",
    MG0021: "Transport",
  };

  const processContainer = (id: string, title: string) => {
    const container = doc.getElementById(id);
    if (!container) return;

    const links: QuickLink[] = [];
    const anchors = container.querySelectorAll("a[data-url]");

    anchors.forEach((a) => {
      let linkTitle = a.textContent?.trim() || "";
      linkTitle = sanitizeMenuTitle(linkTitle); // Sanitize the name here

      const url = a.getAttribute("data-url");

      if (linkTitle && url && !visitedUrls.has(url)) {
        visitedUrls.add(url);
        links.push({
          title: linkTitle,
          url: url,
          category: title,
        });
      }
    });

    if (links.length > 0) {
      categories.push({ id, title, links });
    }
  };

  for (const [id, title] of Object.entries(idMap)) {
    processContainer(id, title);
  }

  const allLinks = doc.querySelectorAll("a[data-url]");
  const generalLinks: QuickLink[] = [];

  allLinks.forEach((a) => {
    const url = a.getAttribute("data-url");
    let linkTitle = a.textContent?.trim() || "Untitled Module";
    linkTitle = sanitizeMenuTitle(linkTitle); // Sanitize catch-all links too

    if (url && !visitedUrls.has(url)) {
      visitedUrls.add(url);
      generalLinks.push({
        title: linkTitle,
        url: url,
        category: "General / Utilities",
      });
    }
  });

  if (generalLinks.length > 0) {
    categories.push({
      id: "GENERAL_CATCHALL",
      title: "General / Utilities",
      links: generalLinks,
    });
  }

  return categories;
}

export function scrapeUserProfile(doc: Document) {
  const navText =
    doc.querySelector(".navbar-text.text-light.small.fw-bold")?.textContent ||
    "";
  const regNo = navText.split("(")[0].trim() || "Student";
  const name = navText.split("-")[1]?.split(")")[0]?.trim() || "User";
  return { name, regNo };
}
