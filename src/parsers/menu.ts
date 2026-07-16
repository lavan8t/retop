import { MenuCategory, QuickLink } from "../types/vtop";

const sanitizeMenuTitle = (title: string): string => {
  const lowerTitle = title.toLowerCase();

  if (
    lowerTitle.includes("course page consolidated") ||
    lowerTitle === "course page"
  ) {
    return "Course Page";
  }

  if (lowerTitle.includes("grade")) {
    return "Grades & History";
  }

  if (lowerTitle === "student profile") {
    return "Profile";
  }

  return title;
};

export function scrapeMenu(doc: Document): MenuCategory[] {
  const categories: MenuCategory[] = [];
  const visitedUrls = new Set<string>();

  // Find all category headers dynamically
  const categoryAnchors = doc.querySelectorAll("a.hmenuItem, a.hmenuitem");

  categoryAnchors.forEach((categoryAnchor) => {
    // Extract category title (e.g. "Academics")
    let title = categoryAnchor.textContent?.trim() || "";
    // Remove any extra whitespace
    title = title.replace(/\s+/g, " ").trim();
    if (!title || title === "☰") return;

    // The links are in a container whose ID matches the anchor's href
    const href = categoryAnchor.getAttribute("href");
    if (!href || !href.startsWith("#")) return;
    
    const targetId = href.substring(1);
    const container = doc.getElementById(targetId);
    if (!container) return;

    const links: QuickLink[] = [];
    const anchors = container.querySelectorAll("a[data-url]");

    anchors.forEach((a) => {
      let linkTitle = a.textContent?.trim() || "";
      linkTitle = sanitizeMenuTitle(linkTitle);
      const url = a.getAttribute("data-url");

      if (linkTitle && url && !visitedUrls.has(url)) {
        if (!links.find(l => l.title === linkTitle)) {
          visitedUrls.add(url);
          links.push({
            title: linkTitle,
            url: url,
            category: title,
          });
        }
      }
    });

    if (links.length > 0) {
      categories.push({ id: targetId, title, links });
    }
  });

  // Catch any links that weren't inside a known category
  const allLinks = doc.querySelectorAll("a[data-url]");
  const generalLinks: QuickLink[] = [];

  allLinks.forEach((a) => {
    const url = a.getAttribute("data-url");
    let linkTitle = a.textContent?.trim() || "Untitled Module";
    linkTitle = sanitizeMenuTitle(linkTitle);

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
  const name = navText.split("-")[1]?.split(")")[0]?.trim() || "Person";
  const profileImgBase64 = doc.querySelector("img#retop-profile-image-mock")?.getAttribute("src") || undefined;
  return { name, regNo, profileImgBase64 };
}
