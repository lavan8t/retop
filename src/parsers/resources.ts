import { parseHTMLFast, validateParsed, Versioned } from "../utils/parser-utils";

export const RESOURCES_SCHEMA_VERSION = 1;

export interface OfficialResourceItem {
  id: string;
  title: string;
  url: string;
  category: string;
  icon?: string;
  badge?: string;
  description?: string;
}

export function parseOfficialResources(html: string): Versioned<OfficialResourceItem[]> {
  if (!html) return validateParsed([], "resources");
  const doc = parseHTMLFast(html);
  const items: OfficialResourceItem[] = [];
  const seenUrls = new Set<string>();

  // Each .portal-wrapper represents a category / section
  const wrappers = doc.querySelectorAll(".portal-wrapper");

  wrappers.forEach((wrapper, wIdx) => {
    let category =
      wrapper.querySelector(".portal-title")?.textContent?.trim() ||
      wrapper.querySelector(".section-divider span")?.textContent?.trim() ||
      "Official Applications";

    category = category.replace(/^[📱🌐\s]+/, "").trim();

    const cards = wrapper.querySelectorAll(".portal-card");
    cards.forEach((card, cIdx) => {
      const url = card.getAttribute("href") || "";
      let title = card.querySelector(".portal-name")?.textContent?.trim() || "";
      if (!title) title = card.textContent?.trim() || "";

      if (url && title && !seenUrls.has(url)) {
        seenUrls.add(url);
        const id = `res_${wIdx}_${cIdx}_${title.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

        let typeBadge = "Web";
        if (category.toLowerCase().includes("playstore")) typeBadge = "Android";
        else if (category.toLowerCase().includes("appstore")) typeBadge = "iOS";

        items.push({
          id,
          title,
          url,
          category,
          badge: typeBadge,
        });
      }
    });
  });

  return validateParsed(items, "resources");
}
