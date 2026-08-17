import { scrapeMenu } from "../../parsers/menu";
import { QuickLink } from "../../types/vtop";

export function injectLegacyMenuSearch(): void {
  if (typeof document === "undefined") return;

  const hmenuBar = document.getElementById("top-hmenu-bar");
  if (!hmenuBar) return;

  if (document.getElementById("retop-legacy-menu-search-wrapper")) return;

  const containerFluid = hmenuBar.querySelector(".container-fluid") || hmenuBar;

  const wrapper = document.createElement("div");
  wrapper.id = "retop-legacy-menu-search-wrapper";
  wrapper.className = "d-inline-flex align-items-center ms-2 me-auto position-relative";
  wrapper.style.cssText = "min-width: 220px; max-width: 320px; z-index: 1050;";

  wrapper.innerHTML = `
    <div class="input-group input-group-sm w-100" style="border-radius: 9999px; overflow: hidden; background: rgba(125, 125, 125, 0.08); border: 1px solid rgba(125, 125, 125, 0.2);">
      <span class="input-group-text bg-transparent border-0 py-1 ps-2 pe-1 text-muted">
        <i class="fa fa-search small"></i>
      </span>
      <input
        type="text"
        id="retop-legacy-menu-search-input"
        class="form-control form-control-sm bg-transparent border-0 shadow-none ps-1 py-1 text-reset"
        placeholder="Search menu ( / or Ctrl+K )"
        autocomplete="off"
        style="font-size: 12px; font-weight: 500;"
      />
      <button
        type="button"
        id="retop-legacy-menu-search-clear"
        class="btn btn-sm bg-transparent border-0 text-muted px-2 d-none"
        style="font-size: 11px;"
      >
        <i class="fa fa-times"></i>
      </button>
    </div>
    <div
      id="retop-legacy-menu-search-dropdown"
      class="dropdown-menu shadow-lg p-1 position-absolute w-100 mt-1 custom-scrollbar"
      style="display: none; max-height: 360px; overflow-y: auto; z-index: 1055; top: 100%; left: 0; min-width: 280px; border-radius: 12px;"
    >
    </div>
  `;

  // Insert after quickLinks or at the start of containerFluid
  const quickLinks = document.getElementById("quickLinks");
  if (quickLinks && quickLinks.nextSibling) {
    containerFluid.insertBefore(wrapper, quickLinks.nextSibling);
  } else {
    containerFluid.prepend(wrapper);
  }

  const input = wrapper.querySelector("#retop-legacy-menu-search-input") as HTMLInputElement;
  const clearBtn = wrapper.querySelector("#retop-legacy-menu-search-clear") as HTMLButtonElement;
  const dropdown = wrapper.querySelector("#retop-legacy-menu-search-dropdown") as HTMLDivElement;

  let activeIndex = -1;
  let currentMatches: QuickLink[] = [];

  const triggerLegacyClick = (link: QuickLink) => {
    // 1. Search for matching anchor in DOM
    const anchors = Array.from(document.querySelectorAll<HTMLElement>("a[data-url], #top-hmenu-bar a, .hmenubox a"));
    let target = anchors.find((a) => {
      const u = a.getAttribute("data-url") || a.getAttribute("href") || "";
      return u.toLowerCase().includes(link.url.toLowerCase());
    });

    if (!target) {
      target = anchors.find((a) => {
        const text = (a.textContent || "").trim().toLowerCase();
        return text === link.title.toLowerCase() || text.includes(link.title.toLowerCase());
      });
    }

    if (target) {
      target.click();
    } else {
      window.dispatchEvent(
        new CustomEvent("retop-execute-legacy", {
          detail: {
            code: `
              if (typeof ajaxB5Call === 'function') {
                var auth = $("#authorizedIDX").val();
                var data = "verifyMenu=true&authorizedID=" + auth + "&_csrf=" + (window.csrfValue || "") + "&nocache=" + new Date().getTime();
                ajaxB5Call("${link.url}", data);
              } else if (typeof ajaxCall === 'function') {
                var auth = $("#authorizedIDX").val();
                var data = "verifyMenu=true&authorizedID=" + auth + "&_csrf=" + (window.csrfValue || "") + "&nocache=" + new Date().getTime();
                ajaxCall("${link.url}", data);
              }
            `,
          },
        })
      );
    }

    dropdown.style.display = "none";
    input.value = "";
    clearBtn.classList.add("d-none");
    input.blur();
  };

  const renderResults = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      dropdown.style.display = "none";
      clearBtn.classList.add("d-none");
      return;
    }

    clearBtn.classList.remove("d-none");

    const categories = scrapeMenu(document);
    const allLinks = categories.flatMap((c) => c.links);

    const matches: { link: QuickLink; score: number }[] = [];
    const seen = new Set<string>();

    for (const link of allLinks) {
      const key = `${link.title.toLowerCase()}:${link.url.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const titleLower = link.title.toLowerCase();
      const urlLower = link.url.toLowerCase();
      const catLower = (link.category || "").toLowerCase();
      const subLower = (link.subheading || "").toLowerCase();

      let score = 0;
      if (titleLower === q) score = 100;
      else if (titleLower.startsWith(q)) score = 80;
      else if (titleLower.includes(q)) score = 60;
      else if (subLower.includes(q) || catLower.includes(q) || urlLower.includes(q)) score = 40;

      if (score > 0) matches.push({ link, score });
    }

    currentMatches = matches.sort((a, b) => b.score - a.score).map((m) => m.link).slice(0, 12);
    activeIndex = currentMatches.length > 0 ? 0 : -1;

    if (currentMatches.length === 0) {
      dropdown.innerHTML = `<div class="p-2 text-muted text-center small">No menu items found for "<strong>${query}</strong>"</div>`;
      dropdown.style.display = "block";
      return;
    }

    dropdown.innerHTML = currentMatches
      .map((link, idx) => {
        const catBadge = link.category ? `<span class="badge bg-secondary-subtle text-secondary-emphasis border me-1" style="font-size: 9px;">${link.category}</span>` : "";
        const subBadge = link.subheading ? `<small class="text-muted ms-1">(${link.subheading})</small>` : "";
        return `
          <a
            href="#"
            data-index="${idx}"
            class="dropdown-item d-flex align-items-center justify-content-between py-1.5 px-2 rounded ${idx === 0 ? "active" : ""}"
            style="font-size: 12px; text-decoration: none;"
          >
            <div class="text-truncate me-2">
              ${catBadge}
              <span class="fw-semibold">${link.title}</span>
              ${subBadge}
            </div>
            <i class="fa fa-angle-right text-muted small"></i>
          </a>
        `;
      })
      .join("");

    dropdown.style.display = "block";

    // Attach click listeners to rendered dropdown items
    dropdown.querySelectorAll("a[data-index]").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const idx = parseInt((item as HTMLElement).getAttribute("data-index") || "0", 10);
        if (currentMatches[idx]) {
          triggerLegacyClick(currentMatches[idx]);
        }
      });
    });
  };

  input.addEventListener("input", (e) => {
    renderResults((e.target as HTMLInputElement).value);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      renderResults(input.value);
    }
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    dropdown.style.display = "none";
    clearBtn.classList.add("d-none");
    input.focus();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (currentMatches.length > 0) {
        activeIndex = (activeIndex + 1) % currentMatches.length;
        updateActiveDropdownItem();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (currentMatches.length > 0) {
        activeIndex = (activeIndex - 1 + currentMatches.length) % currentMatches.length;
        updateActiveDropdownItem();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && currentMatches[activeIndex]) {
        triggerLegacyClick(currentMatches[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      dropdown.style.display = "none";
      input.blur();
    }
  });

  const updateActiveDropdownItem = () => {
    dropdown.querySelectorAll("a[data-index]").forEach((el, idx) => {
      if (idx === activeIndex) {
        el.classList.add("active");
        (el as HTMLElement).scrollIntoView({ block: "nearest" });
      } else {
        el.classList.remove("active");
      }
    });
  };

  // Close dropdown on outside click
  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target as Node)) {
      dropdown.style.display = "none";
    }
  });

  // Global hotkeys to focus legacy menu search (/ or Ctrl+K)
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    const target = (e.composedPath ? e.composedPath()[0] : e.target) as HTMLElement;
    const isInput =
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable);

    if (isInput) return;

    if (e.key === "/" || (e.ctrlKey && e.key.toLowerCase() === "k") || (e.metaKey && e.key.toLowerCase() === "k")) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}
