import { SpotlightCategoryGroup, SpotlightLinkItem } from "../types/vtop";

function parseAnchorItem(a: Element): SpotlightLinkItem | null {
  const title = a.textContent?.trim() || "";
  if (!title) return null;

  const href = a.getAttribute("href") || "";
  const onclick = a.getAttribute("onclick") || "";

  let url: string | undefined = undefined;
  let downloadId: string | undefined = undefined;
  let isDownload = false;
  let isExternal = false;

  if (onclick.includes("vtopDownload")) {
    const match = onclick.match(/vtopDownload\s*\(\s*['"]([^'"]+)['"]/);
    if (match && match[1]) {
      downloadId = match[1];
      isDownload = true;
    }
  } else if (href && href !== "javascript:void(0);" && href !== "#") {
    url = href;
    if (href.startsWith("http")) {
      isExternal = true;
    }
  }

  if (title && (url || downloadId)) {
    return { title, url, downloadId, isDownload, isExternal };
  }
  return null;
}

export function scrapeSpotlight(doc: Document): SpotlightCategoryGroup[] {
  const spotlightGroups: SpotlightCategoryGroup[] = [];

  // Strategy 1: Find offcanvas spotlight divs (.spotlightMsgDivs)
  const spotlightDivs = doc.querySelectorAll(".spotlightMsgDivs");

  spotlightDivs.forEach((div) => {
    const categoryTitle =
      div.querySelector("h5")?.textContent?.trim() || "Announcements";
    const items: SpotlightLinkItem[] = [];

    const anchors = div.querySelectorAll("a");
    anchors.forEach((a) => {
      const item = parseAnchorItem(a);
      if (item) items.push(item);
    });

    if (items.length > 0) {
      spotlightGroups.push({ category: categoryTitle, items });
    }
  });

  // Strategy 2: Check spotlight cards in grid
  if (spotlightGroups.length === 0) {
    const cards = doc.querySelectorAll(".row-cols-1 .card, .card");
    cards.forEach((card) => {
      const btn = card.querySelector("button[data-spotlighttitle]");
      const header = card.querySelector(".card-header, h5, h6");
      
      const categoryTitle =
        btn?.querySelector("span")?.textContent?.trim() ||
        btn?.getAttribute("data-spotlighttitle") ||
        header?.textContent?.trim() ||
        "Announcements";

      const items: SpotlightLinkItem[] = [];
      const anchors = card.querySelectorAll("a.list-group-item-action, a[onclick*='vtopDownload'], a[data-url]");

      anchors.forEach((a) => {
        const item = parseAnchorItem(a);
        if (item) items.push(item);
      });

      if (items.length > 0) {
        spotlightGroups.push({ category: categoryTitle, items });
      }
    });
  }

  return spotlightGroups;
}
