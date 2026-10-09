import { get as idbGet, set as idbSet } from "idb-keyval";

const ROLE_NAV_ITEMS = [
  {
    id: "student",
    label: "Student",
    flag: "VTOP",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-120 200-272v-240L40-600l440-240 440 240v320h-80V-556l-80 44v240L480-120Z"/></svg>`,
  },
  {
    id: "employee",
    label: "Faculty",
    flag: "VTOP",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Z"/></svg>`,
  },
  {
    id: "parent",
    label: "Parent",
    flag: "parent",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z"/></svg>`,
  },
  {
    id: "alumni",
    label: "Alumni",
    flag: "alumni",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="m354-287 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>`,
  },
];

export function updateRolePlaceholders(role: string): void {
  const isFaculty = role === "employee";
  const labelText = isFaculty ? "Emp ID" : "Username";
  const placeholderText = isFaculty ? "Emp ID" : "Username";

  const userInput = (document.getElementById("username") ||
    document.getElementById("authorizedIDX") ||
    document.querySelector("input[name='username']")) as HTMLInputElement | null;

  if (userInput) {
    userInput.setAttribute("placeholder", " "); // Space enables floating label CSS
    const label = userInput.parentElement?.querySelector(".retop-floating-label");
    if (label) {
      label.textContent = labelText;
    }
  }

  const welcomeText = document.getElementById("retop-welcome-text");
  if (welcomeText) {
    welcomeText.textContent = isFaculty ? "Faculty Portal Access" : "Welcome back.";
  }
}

export function updateSwitcherActiveState(activeRoleId: string): void {
  const items = document.querySelectorAll(".retop-navrail-item");
  items.forEach((item) => {
    const el = item as HTMLElement;
    if (el.dataset.role === activeRoleId) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });
}

export async function injectRoleSwitcher(activeRole?: string): Promise<void> {
  if (typeof document === "undefined") return;

  const role =
    activeRole ||
    ((await idbGet("retop-user-role")) as string) ||
    "student";

  // If already mounted, update state
  if (document.getElementById("retop-role-navrail")) {
    updateSwitcherActiveState(role);
    if (role === "employee" || role === "student") {
      updateRolePlaceholders(role);
    }
    return;
  }

  // Material 3 Navigation Rail styling
  if (!document.getElementById("retop-navrail-style")) {
    const style = document.createElement("style");
    style.id = "retop-navrail-style";
    style.textContent = `
      #retop-role-navrail {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        padding: 4px !important;
        background: transparent !important;
        border: none !important;
        border-radius: 0 !important;
        backdrop-filter: none !important;
        box-shadow: none !important;
        position: fixed !important;
        left: 20px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        z-index: 10000 !important;
        box-sizing: border-box !important;
        font-family: 'Google Sans Flex', system-ui, -apple-system, sans-serif !important;
      }

      @media (max-width: 991px) {
        #retop-role-navrail {
          position: relative !important;
          left: auto !important;
          top: auto !important;
          transform: none !important;
          flex-direction: row !important;
          justify-content: center !important;
          margin: 12px auto 16px auto !important;
          max-width: 340px !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
      }

      .retop-navrail-item {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        width: 58px !important;
        height: 50px !important;
        padding: 4px 2px !important;
        background: transparent !important;
        border: none !important;
        border-radius: 12px !important;
        cursor: pointer !important;
        transition: all 0.2s cubic-bezier(0.2, 0, 0, 1) !important;
        outline: none !important;
        user-select: none !important;
        gap: 3px !important;
        color: var(--text-muted, #71717a) !important;
        opacity: 0.65 !important;
      }

      .retop-navrail-item:hover {
        color: var(--text-main, #ffffff) !important;
        background: transparent !important;
        opacity: 0.9 !important;
      }

      .retop-navrail-icon {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 32px !important;
        height: 24px !important;
        background: transparent !important;
        transition: transform 0.2s ease, color 0.2s ease !important;
      }

      .retop-navrail-item.active {
        color: var(--accent-base, #3b82f6) !important;
        opacity: 1 !important;
      }

      .retop-navrail-item.active .retop-navrail-icon {
        background: transparent !important;
        color: var(--accent-base, #3b82f6) !important;
        box-shadow: none !important;
        transform: scale(1.1) !important;
      }

      .retop-navrail-label {
        font-size: 11px !important;
        font-weight: 500 !important;
        letter-spacing: 0 !important;
        text-transform: none !important;
        line-height: 1 !important;
      }

      .retop-navrail-item.active .retop-navrail-label {
        font-weight: 600 !important;
      }
    `;
    document.head.appendChild(style);
  }

  const rail = document.createElement("aside");
  rail.id = "retop-role-navrail";
  rail.className = "retop-role-navrail";

  ROLE_NAV_ITEMS.forEach((r) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `retop-navrail-item ${role === r.id ? "active" : ""}`;
    btn.dataset.role = r.id;
    btn.title = r.label;

    btn.innerHTML = `
      <div class="retop-navrail-icon">${r.svg}</div>
      <span class="retop-navrail-label">${r.label}</span>
    `;

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const current = ((await idbGet("retop-user-role")) as string) || "student";
      if (current === r.id) return;

      await idbSet("retop-user-role", r.id);

      const isStudentOrEmpTarget = r.id === "student" || r.id === "employee";
      const isStudentOrEmpCurrent = current === "student" || current === "employee";

      // If toggling between Student and Faculty on vtopLoginForm:
      // Both share flag "VTOP" and /vtop/login, so switch in-place without page reload!
      if (isStudentOrEmpTarget && isStudentOrEmpCurrent && document.getElementById("vtopLoginForm")) {
        updateSwitcherActiveState(r.id);
        updateRolePlaceholders(r.id);
        return;
      }

      // Switching across form types (to/from Parent or Alumni):
      const csrfInput = document.querySelector('input[name="_csrf"]') as HTMLInputElement | null;
      const csrf = csrfInput?.value || "";

      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/vtop/prelogin/setup";
      form.style.display = "none";

      const csrfField = document.createElement("input");
      csrfField.type = "hidden";
      csrfField.name = "_csrf";
      csrfField.value = csrf;
      form.appendChild(csrfField);

      const flagField = document.createElement("input");
      flagField.type = "hidden";
      flagField.name = "flag";
      flagField.value = r.flag;
      form.appendChild(flagField);

      document.body.appendChild(form);
      form.submit();
    });

    rail.appendChild(btn);
  });

  if (window.innerWidth >= 992) {
    document.body.appendChild(rail);
  } else {
    const loginBox =
      document.getElementById("loginBox") ||
      document.querySelector(".form-signin")?.parentElement;
    if (loginBox) {
      loginBox.insertBefore(rail, loginBox.firstChild);
    } else {
      document.body.appendChild(rail);
    }
  }

  if (role === "employee") {
    updateRolePlaceholders("employee");
  } else {
    updateRolePlaceholders("student");
  }
}
