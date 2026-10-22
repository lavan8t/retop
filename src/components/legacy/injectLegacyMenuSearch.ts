import { scrapeMenu } from "../../parsers/menu";
import { QuickLink } from "../../types/vtop";

let isLegacyHotkeyRegistered = false;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function injectLegacyMenuSearch(): void {
  if (typeof document === "undefined") return;

  const hmenuBar = document.getElementById("top-hmenu-bar");
  if (!hmenuBar) return;

  if (document.getElementById("retop-legacy-menu-search-wrapper")) return;

  // Find the menu navbar row
  const navList = hmenuBar.querySelector("#navbarSupportedContent ul.navbar-nav, .navbar-nav");
  const containerFluid = hmenuBar.querySelector(".container-fluid") || hmenuBar;

  const liWrapper = document.createElement("li");
  liWrapper.id = "retop-legacy-menu-search-wrapper";
  liWrapper.className = "nav-item d-inline-flex align-items-center position-relative my-auto ms-lg-2";
  liWrapper.style.cssText = "min-width: 220px; max-width: 290px; height: 36px; z-index: 1050; font-family: OpenSans, 'Open Sans', 'Google Sans Flex', sans-serif; font-size: 14px;";

  liWrapper.innerHTML = `
    <div class="input-group input-group-sm w-100 retop-legacy-search-box d-flex align-items-center" style="height: 34px; border-radius: 9999px; overflow: hidden; background: linear-gradient(135deg, rgba(30, 60, 114, 0.85) 0%, rgba(42, 82, 152, 0.85) 100%); border: 1px solid rgba(255, 255, 255, 0.25); transition: none !important;">
      <span class="input-group-text bg-transparent border-0 py-0 ps-2.5 pe-1 text-muted d-flex align-items-center">
        <i class="fa fa-search" style="font-size: 13px; color: rgba(255, 255, 255, 0.85);"></i>
      </span>
      <input
        type="text"
        id="retop-legacy-menu-search-input"
        class="form-control form-control-sm bg-transparent border-0 shadow-none ps-1 py-0 text-reset"
        placeholder="Search menu..."
        autocomplete="off"
        style="font-family: OpenSans, 'Open Sans', 'Google Sans Flex', sans-serif; font-size: 14px; font-weight: 600; color: #ffffff; height: 32px; line-height: 32px;"
      />
      <button
        type="button"
        id="retop-legacy-menu-search-clear"
        class="btn btn-sm bg-transparent border-0 text-muted px-2 d-none d-flex align-items-center justify-content-center"
        style="font-size: 12px; color: rgba(255, 255, 255, 0.85);"
      >
        <i class="fa fa-times"></i>
      </button>
    </div>
    <div
      id="retop-legacy-menu-search-dropdown"
      class="dropdown-menu shadow-lg p-1.5 position-absolute w-100 mt-1 custom-scrollbar"
      style="display: none; max-height: min(450px, calc(100vh - 130px)); overflow-y: auto; z-index: 1055; top: 100%; left: 0; min-width: 320px; border-radius: 16px; font-family: OpenSans, 'Open Sans', 'Google Sans Flex', sans-serif; background: linear-gradient(160deg, #162447 0%, #0f1c3f 100%); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45); transition: none !important; animation: none !important;"
    >
    </div>
  `;

  // Insert directly into the navbar-nav row so it sits in the same line
  if (navList) {
    navList.appendChild(liWrapper);
  } else {
    const quickLinks = document.getElementById("quickLinks");
    if (quickLinks) {
      quickLinks.appendChild(liWrapper);
    } else {
      containerFluid.appendChild(liWrapper);
    }
  }

  const input = liWrapper.querySelector("#retop-legacy-menu-search-input") as HTMLInputElement;
  const clearBtn = liWrapper.querySelector("#retop-legacy-menu-search-clear") as HTMLButtonElement;
  const dropdown = liWrapper.querySelector("#retop-legacy-menu-search-dropdown") as HTMLDivElement;

  let activeIndex = -1;
  let currentMatches: QuickLink[] = [];

  const triggerLegacyClick = (link: QuickLink) => {
    // 1. Search for matching anchor in DOM
    const anchors = Array.from(document.querySelectorAll<HTMLElement>("a[data-url], #top-hmenu-bar a, .hmenubox a, [id^='MG'] a"));
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
                ajaxB5Call(${JSON.stringify(link.url)}, data);
              } else if (typeof ajaxCall === 'function') {
                var auth = $("#authorizedIDX").val();
                var data = "verifyMenu=true&authorizedID=" + auth + "&_csrf=" + (window.csrfValue || "") + "&nocache=" + new Date().getTime();
                ajaxCall(${JSON.stringify(link.url)}, data);
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

    currentMatches = matches.sort((a, b) => b.score - a.score).map((m) => m.link).slice(0, 16);
    activeIndex = currentMatches.length > 0 ? 0 : -1;

    if (currentMatches.length === 0) {
      const escaped = query.replace(/[<>&"']/g, c => `&#${c.charCodeAt(0)};`);
      dropdown.innerHTML = `<div class="p-3 text-muted text-center small">No menu items matching "<strong>${escaped}</strong>"</div>`;
      dropdown.style.display = "block";
      return;
    }

    dropdown.innerHTML = currentMatches
      .map((link, idx) => {
        const catBadge = link.category ? `<span class="badge border me-1.5" style="font-size: 9px; font-weight: 700; padding: 2px 6px; background-color: rgba(59, 130, 246, 0.25); color: #93c5fd; border-color: rgba(147, 197, 253, 0.3); transition: none !important;">${escapeHtml(link.category)}</span>` : "";
        const subBadge = link.subheading ? `<small class="ms-1" style="font-size: 10.5px; color: rgba(255, 255, 255, 0.7); transition: none !important;">(${escapeHtml(link.subheading)})</small>` : "";
        return `
          <a
            href="#"
            data-index="${idx}"
            class="dropdown-item d-flex align-items-center justify-content-between py-2 px-2.5 rounded-3 mb-0.5 ${idx === 0 ? "active" : ""}"
            style="font-size: 12.5px; text-decoration: none; color: #ffffff; transition: none !important; animation: none !important;"
          >
            <div class="text-truncate me-2">
              ${catBadge}
              <span class="fw-bold">${escapeHtml(link.title)}</span>
              ${subBadge}
            </div>
            <i class="fa fa-chevron-right" style="font-size: 10px; color: rgba(255, 255, 255, 0.5);"></i>
          </a>
        `;
      })
      .join("");

    dropdown.style.display = "block";

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
    if (!liWrapper.contains(e.target as Node)) {
      dropdown.style.display = "none";
    }
  });

  // Hotkey: "/" or Ctrl/Cmd+K opens legacy menu search ONLY when on legacy VTOP
  if (!isLegacyHotkeyRegistered) {
    isLegacyHotkeyRegistered = true;
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      const isLegacyVisible =
        document.body.classList.contains("show-legacy-ui") ||
        document.documentElement.classList.contains("show-legacy-ui");

      // Only process if legacy VTOP is active/visible
      if (!isLegacyVisible) return;

      const target = (e.composedPath ? e.composedPath()[0] : e.target) as HTMLElement;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (isInput) return;

      if (
        e.key === "/" ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")
      ) {
        const legacyInput = document.getElementById("retop-legacy-menu-search-input") as HTMLInputElement | null;
        if (legacyInput) {
          e.preventDefault();
          legacyInput.focus();
          legacyInput.select();
        }
      }
    });
  }
}

