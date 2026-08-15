import { SpotlightCategoryGroup, SpotlightLinkItem } from "../types/vtop";

function parseAnchorItem(a: Element): SpotlightLinkItem | null {
  const clone = a.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".badge, .label, i, svg, small, span.text-danger").forEach((el) => el.remove());
  let title = clone.textContent?.trim() || "";
  title = title.replace(/\s+/g, " ").replace(/^[•\-\*›»\d\.]+\s*/, "").trim();
  if (!title) return null;

  const href = a.getAttribute("href") || "";
  const onclick = a.getAttribute("onclick") || "";
  const dataUrl = a.getAttribute("data-url") || a.getAttribute("data-href") || "";

  let url: string | undefined = undefined;
  let downloadId: string | undefined = undefined;
  let isDownload = false;
  let isExternal = false;

  if (onclick.includes("vtopDownload") || onclick.includes("downloadFile")) {
    const match =
      onclick.match(/(?:vtopDownload|downloadFile)\s*\(\s*['"]([^'"]+)['"]/i) ||
      onclick.match(/['"]([a-zA-Z0-9_\-\/]+(?:Download|File|Circular|Event|Notice)[a-zA-Z0-9_\-\/]*)['"]/i);
    if (match && match[1]) {
      downloadId = match[1];
      isDownload = true;
    }
  } else if (dataUrl && dataUrl !== "#" && !dataUrl.startsWith("javascript:")) {
    url = dataUrl;
  } else if (href && href !== "javascript:void(0);" && href !== "javacript:void(0);" && href !== "#") {
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
  const seenTitles = new Set<string>();

  // Strategy 1: Find offcanvas spotlight divs & containers (.spotlightMsgDivs, [id*='spotlight'])
  const spotlightDivs = doc.querySelectorAll(
    ".spotlightMsgDivs, [id*='spotlight'], [class*='spotlight'], .spotlight-background, #spotLightDiv"
  );

  spotlightDivs.forEach((div) => {
    const categoryTitle =
      div.querySelector("h5, h6, .card-title, .spotlightHeader, strong")?.textContent?.trim() ||
      "Announcements";
    const items: SpotlightLinkItem[] = [];

    const anchors = div.querySelectorAll("a, button[data-spotlighttitle]");
    anchors.forEach((a) => {
      const item = parseAnchorItem(a);
      if (item && !seenTitles.has(item.title.toLowerCase())) {
        seenTitles.add(item.title.toLowerCase());
        items.push(item);
      }
    });

    if (items.length > 0) {
      spotlightGroups.push({ category: categoryTitle, items });
    }
  });

  // Strategy 2: Check spotlight cards in grid or notification lists
  if (spotlightGroups.length === 0) {
    const cards = doc.querySelectorAll(".row-cols-1 .card, .card, .list-group");
    cards.forEach((card) => {
      const btn = card.querySelector("button[data-spotlighttitle]");
      const header = card.querySelector(".card-header, h5, h6, .card-title");

      const categoryTitle =
        btn?.querySelector("span")?.textContent?.trim() ||
        btn?.getAttribute("data-spotlighttitle") ||
        header?.textContent?.trim() ||
        "Announcements";

      const items: SpotlightLinkItem[] = [];
      const anchors = card.querySelectorAll(
        "a.list-group-item-action, a[onclick*='vtopDownload'], a[onclick*='downloadFile'], a[data-url], li a"
      );

      anchors.forEach((a) => {
        const item = parseAnchorItem(a);
        if (item && !seenTitles.has(item.title.toLowerCase())) {
          seenTitles.add(item.title.toLowerCase());
          items.push(item);
        }
      });

      if (items.length > 0) {
        spotlightGroups.push({ category: categoryTitle, items });
      }
    });
  }

  // Strategy 3: Direct anchor collection across document if no groups found
  if (spotlightGroups.length === 0) {
    const directAnchors = doc.querySelectorAll(
      "a[onclick*='vtopDownload'], a[onclick*='downloadFile'], a.list-group-item, marquee a, .marquee a"
    );
    const items: SpotlightLinkItem[] = [];
    directAnchors.forEach((a) => {
      const item = parseAnchorItem(a);
      if (item && !seenTitles.has(item.title.toLowerCase())) {
        seenTitles.add(item.title.toLowerCase());
        items.push(item);
      }
    });

    if (items.length > 0) {
      spotlightGroups.push({ category: "Spotlight Announcements", items });
    }
  }

  return spotlightGroups;
}

