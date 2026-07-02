import { Event } from "../types/vtop";

export function parseEvents(html: string): Event[] {
  if (!html) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const events: Event[] = [];

  const cards = doc.querySelectorAll(".card-body.small");
  cards.forEach((card) => {
    // Structure:
    // <div><span class="card-title fw-bold me-2">Title</span>(<span class="fst-italic mx-2">Category</span>)</div>
    // <div class="card-text fst-italic"><span class="mx-3 fw-bold text-secondary">2026-07-03</span></div>
    // <span class="card-text ms-3"><small class="text-dark fw-bold">Organizer</small></span>
    
    const titleSpan = card.querySelector(".card-title.fw-bold.me-2");
    const categorySpan = card.querySelector(".fst-italic.mx-2");
    const dateSpan = card.querySelector(".card-text.fst-italic .fw-bold.text-secondary");
    const organizerSpan = card.querySelector(".card-text.ms-3 small");

    if (titleSpan) {
      const title = titleSpan.textContent?.trim() || "";
      const category = categorySpan?.textContent?.trim() || "";
      const date = dateSpan?.textContent?.trim() || "";
      const organizer = organizerSpan?.textContent?.trim() || "";

      if (title) {
        events.push({
          title,
          category,
          date,
          organizer
        });
      }
    }
  });

  return events;
}
