import { renderDashboard } from "./pages/app";
import {
  injectGlobalStyles,
  injectGlobalFonts,
  initializeContainer,
  injectSplashScreen,
  removeSplashScreen,
} from "./utils/bridge";
import { asciiArt } from "./components/asciiArt";
import { autoSolveCaptcha } from "./utils/captchaSolver";
import { vitLogoSvg } from "./components/vitLogoSvg";

const vtopContext = {
  csrf: "",
  authId: "",
};

const isPaused = () => {
  const pausedUntil = localStorage.getItem("retop-paused-until");
  return pausedUntil && Date.now() < parseInt(pausedUntil, 10);
};

function injectHaltWidget() {
  if (document.getElementById("retop-halt-widget")) return;

  const style = document.createElement("style");
  style.textContent = `
    #retop-halt-widget {
      position: fixed;
      bottom: 1rem;
      left: 1rem;
      z-index: 9999999;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      font-family: 'Google Sans Flex', system-ui, sans-serif !important;
    }
    .retop-halt-icon {
      background: transparent;
      color: var(--text-muted, #6c757d);
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease-out;
    }
    .retop-halt-icon:hover {
      background: transparent;
      color: var(--accent-base, #0d6efd);
      transform: scale(1.1);
      box-shadow: none;
    }
    .retop-halt-icon:active {
      transform: scale(0.9);
      box-shadow: none;
    }
    .retop-halt-callout {
      position: absolute;
      bottom: 50px;
      left: 0;
      background: var(--bg-main, #fff);
      color: var(--text-main, #000);
      padding: 12px;
      border: 3px solid var(--border-main, #dee2e6);
      box-shadow: 3px 3px 0px 0px var(--shadow-main, #000);
      border-radius: 0.75rem;
      width: max-content;
      max-width: 250px;
      opacity: 0;
      pointer-events: none;
      transform: translateY(10px);
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: left;
    }
    #retop-halt-widget:hover .retop-halt-callout {
      opacity: 1;
      transform: translateY(0);
    }
    .retop-halt-callout strong {
      font-size: 14px;
      font-variation-settings: "wdth" 151, "wght" 800, "GRAD" 100, "ROND" 100 !important;
      text-transform: uppercase;
      letter-spacing: -0.02em;
    }
    .retop-halt-callout span {
      font-size: 12px;
      color: var(--text-muted, #6c757d);
      font-weight: 500;
    }
    .retop-halt-paused .retop-halt-icon {
      background: transparent;
      color: var(--text-main, #000);
      transform: scale(1.1);
      box-shadow: none;
    }
    .retop-halt-paused .retop-halt-icon:hover {
      background: transparent;
      color: var(--accent-base, #0d6efd);
    }
  `;
  document.head.appendChild(style);

  const widget = document.createElement("div");
  widget.id = "retop-halt-widget";
  const paused = isPaused();
  if (paused) widget.classList.add("retop-halt-paused");

  widget.innerHTML = `
    <div class="retop-halt-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    </div>
    <div class="retop-halt-callout">
      <strong>${paused ? "Resume retop" : "Halt retop"}</strong>
      <span>${paused ? "Enable the extension again." : "Experiencing issues with the extension? Disable it for an hour."}</span>
    </div>
  `;

  widget.addEventListener("click", () => {
    if (paused) {
      localStorage.removeItem("retop-paused-until");
    } else {
      localStorage.setItem("retop-paused-until", (Date.now() + 60 * 60 * 1000).toString());
    }
    window.location.reload();
  });

  document.body.appendChild(widget);
}

const init = async () => {
  console.log("[retop] Initializing...");

  injectHaltWidget();
  
  if (isPaused()) {
    console.log("[retop] Extension is currently halted. Falling back to native VTOP.");
    document.body.style.opacity = "1";
    document.body.classList.add("show-legacy-ui");
    return;
  }

  const path = window.location.pathname;

  // CRITICAL: Force native DOM visibility immediately.
  // Prevents the page from going blank.
  document.body.style.opacity = "1";
  document.body.style.display = "block";
  document.body.style.visibility = "visible";
  document.body.classList.add("show-legacy-ui");

  // Strictly ignore /vtop/open/page.
  if (path.includes("/vtop/open/page")) {
    return;
  }

  // Only run the invisible CAPTCHA solver on /vtop/login
  if (path.includes("/vtop/login")) {
    enhanceLegacyLogin();
    return;
  }

  // --- Authenticated Pages Only ---
  document.body.classList.remove("show-legacy-ui");
  injectGlobalStyles();
  injectSplashScreen();

  await waitForTokens();
  initializeContainer();

  if (vtopContext.authId && vtopContext.csrf) {
    console.log("[retop] Session Active.");
    renderDashboard();
  } else {
    document.body.classList.add("show-legacy-ui");
    removeSplashScreen();
  }
};

function waitForTokens(): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 50;

    const interval = setInterval(() => {
      attempts++;
      const csrfInput = document.querySelector(
        'input[name="_csrf"]',
      ) as HTMLInputElement;
      const authInput = document.getElementById(
        "authorizedIDX",
      ) as HTMLInputElement;

      if (csrfInput) vtopContext.csrf = csrfInput.value;
      if (authInput) vtopContext.authId = authInput.value;

      if (vtopContext.csrf || attempts >= maxAttempts) {
        clearInterval(interval);
        resolve(!!vtopContext.csrf);
      }
    }, 100);
  });
}

const injectLoginTheme = () => {
  if (document.getElementById("vtop-login-theme")) return;

  injectGlobalFonts();

  const link = document.createElement("link");
  link.id = "vtop-login-theme";
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("dist/login.css");
  document.head.appendChild(link);

  // Remove native User Icon Wrapper if it exists
  const userIconWrapper = document.getElementById("basic-addon1");
  if (userIconWrapper) {
    userIconWrapper.style.display = "none";
  }

  const passIconWrapper = document.getElementById("basic-addon2");
  if (passIconWrapper) {
    // Keep the id passwordIcon so the legacy toggleEye() function doesn't crash.
    // Include both eye and eye-slash paths inside groups to toggle via CSS based on the FontAwesome classes VTOP adds.
    passIconWrapper.innerHTML = `<svg id="passwordIcon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="fa fa-eye lucide lucide-eye" onclick="javascript:toggleEye();" style="cursor: pointer;">
      <path class="retop-eye-base" d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
      <circle class="retop-eye-pupil" cx="12" cy="12" r="3"/>
      <path class="retop-eye-strike" d="m2 2 20 20"/>
    </svg>`;
  }

  // No custom lock icon injected anymore per user request.

  // Replace Home link with SVG Icon globally
  const replaceHomeButtons = () => {
    try {
      const allLinksAndBtns = document.querySelectorAll(
        ".btn:not(.retop-home-icon), a:not(.retop-home-icon), button:not(.retop-home-icon), input[type='button'], input[type='submit']"
      );
      for (const link of allLinksAndBtns) {
        // Collect all possible text sources
        const altText = link.getAttribute("alt") || "";
        const titleText = link.getAttribute("title") || "";
        const valText = (link as HTMLInputElement).value || "";
        const inner = link.textContent || "";
        
        const rawText = `${inner} ${valText} ${altText} ${titleText}`.toLowerCase();
        
        // Broadly match anything containing 'home' or the specific VTOP open page href
        if (rawText.includes("home") || link.getAttribute("href")?.includes("/vtop/open/page")) {
          if (link.tagName.toLowerCase() === "input" || link.tagName.toLowerCase() === "div") {
            const newBtn = document.createElement("button");
            newBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-house"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;
            newBtn.className = "retop-home-icon";
            newBtn.style.border = "none";
            newBtn.style.background = "transparent";
            newBtn.style.boxShadow = "none";
            if (link.id) newBtn.id = link.id;
            if (link.getAttribute("onclick")) {
              newBtn.setAttribute("onclick", link.getAttribute("onclick")!);
            }
            if (link.parentNode) {
              // If parent is a formatting div, clean it up
              if ((link.parentNode as HTMLElement).classList?.contains("text-end")) {
                (link.parentNode as HTMLElement).classList.remove("text-end");
              }
              link.parentNode.replaceChild(newBtn, link);
            }
          } else {
            link.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-house"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;
            link.className = "retop-home-icon"; // completely overwrite classes
            (link as HTMLElement).style.border = "none";
            (link as HTMLElement).style.background = "transparent";
            (link as HTMLElement).style.boxShadow = "none";
            
            if (link.parentNode && (link.parentNode as HTMLElement).classList?.contains("text-end")) {
              (link.parentNode as HTMLElement).classList.remove("text-end");
            }
          }
        }
      }
    } catch (e) {
      console.error("ret0p: Error replacing home buttons", e);
    }
  };
  replaceHomeButtons();
  // Ensure it catches dynamically injected buttons
  const homeBtnObserver = new MutationObserver(() => replaceHomeButtons());
  homeBtnObserver.observe(document.body, { childList: true, subtree: true });

  // Merge Card Footer Links
  const cardFooter = document.querySelector(".card-footer");
  if (cardFooter && !document.getElementById("retop-merged-footer")) {
    const links = cardFooter.querySelectorAll("a");
    let resetPassLink: HTMLAnchorElement | null = null;
    let forgotUserIdLink: HTMLAnchorElement | null = null;

    for (const link of links) {
      if (link.textContent?.toLowerCase().includes("password"))
        resetPassLink = link;
      if (
        link.textContent?.toLowerCase().includes("loginid") ||
        link.textContent?.toLowerCase().includes("login id")
      )
        forgotUserIdLink = link;
    }

    if (resetPassLink && forgotUserIdLink) {
      const mergedDiv = document.createElement("div");
      mergedDiv.id = "retop-merged-footer";
      mergedDiv.className = "retop-forgot-links";

      mergedDiv.innerHTML = `Forgot <a href="javascript:void(0)" onclick="javascript:resetPassword()">password</a> or <a href="javascript:void(0)" onclick="javascript:forgotUserID()">login ID</a>?`;

      resetPassLink.remove();
      forgotUserIdLink.remove();
      const brs = cardFooter.querySelectorAll("br");
      brs.forEach((br) => br.remove());

      cardFooter.insertBefore(mergedDiv, cardFooter.firstChild);
    }
  }

  // Change "VTOP Login" text to "retop" and add welcome text
  const titleEl = document.querySelector(".card-header.loginBoxBorder h4");
  if (titleEl) {
    if (
      titleEl.textContent === "VTOP Login" ||
      titleEl.textContent === "retop Login" ||
      titleEl.textContent === "retop"
    ) {
      titleEl.textContent = "retop";

      if (!document.getElementById("retop-welcome-text")) {
        const welcome = document.createElement("p");
        welcome.id = "retop-welcome-text";
        welcome.textContent = "Welcome back.";
        titleEl.parentNode?.insertBefore(welcome, titleEl.nextSibling);
      }
    }
  }

  // Change Submit Button Text to "Login"
  const submitBtn = document.getElementById("btnSubmit") as
    | HTMLButtonElement
    | HTMLInputElement;
  if (submitBtn) {
    if (submitBtn.tagName.toLowerCase() === "input") {
      submitBtn.value = "Login";
    } else {
      submitBtn.textContent = "Login";
    }
  } else {
    // Fallback search
    document.querySelectorAll(".btn-primary, .btn-success").forEach((btn) => {
      if (
        btn.textContent?.toLowerCase().includes("submit") ||
        btn.textContent?.toLowerCase().includes("sign in")
      ) {
        btn.textContent = "Login";
      }
    });
  }

  // Error Page Handling
  const errorSpan = document.querySelector("span.text-danger[role='alert']");
  if (errorSpan && errorSpan.textContent?.trim()) {
    const errorText = errorSpan.textContent.trim();
    errorSpan.remove(); // Hide the native ugly text

    // Spawn a beautiful compact brutalist snackbar
    const isCaptchaError = errorText.toLowerCase().includes("captcha");
    const toast = document.createElement("div");
    toast.className = `retop-error-toast ${isCaptchaError ? "retop-warning-toast" : ""}`;
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; white-space: nowrap;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        <span style="font-size: 0.95rem; font-weight: 700; line-height: 1;">${errorText}</span>
      </div>
    `;

    document.body.appendChild(toast);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = "slideDownCenter 0.3s ease forwards";
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  }

  // Replace Native Footer and move to Right Side (Header)
  const nativeFooter = document.querySelector(".footercolor");
  if (nativeFooter) {
    nativeFooter.remove();
  }

  const header = document.getElementById("vtopOpenPageHeader");

  if (header) {
    // 1. Inject the VitLogo Synchronously
    const vitLogo = header.querySelector("img.VITEmblem");
    if (vitLogo && !document.getElementById("retop-react-logo")) {
      const wrapper = document.createElement("div");
      wrapper.id = "retop-react-logo";
      wrapper.className = "VITEmblem"; // Keep class for layout sizing
      wrapper.innerHTML = vitLogoSvg;
      vitLogo.replaceWith(wrapper);
    }

    // 2. Remove the "VIT" text properly
    const vitText = header.querySelector(".VITLogoStyle");
    if (vitText) {
      vitText.remove();
    }

    // 3. Transform the campus text to fit the new width
    const navbarText = header.querySelector(".navbar-text");
    if (navbarText && !navbarText.classList.contains("retop-campus-text")) {
      navbarText.innerHTML = "VELLORE CAMPUS";
      navbarText.classList.add("retop-campus-text");
    }

    // Footer logic moved to the right side
  }

  // Inject ASCII Art full page
  if (!document.getElementById("retop-right-footer-wrapper")) {
    const wrapper = document.createElement("div");
    wrapper.id = "retop-right-footer-wrapper";

    const asciiPre = document.createElement("pre");
    asciiPre.id = "retop-ascii-art";
    asciiPre.textContent = asciiArt;
    wrapper.appendChild(asciiPre);

    document.body.appendChild(wrapper);

    // ASCII Scramble Animation Logic
    const nonSpaceIndices: number[] = [];
    for (let i = 0; i < asciiArt.length; i++) {
      if (asciiArt[i] !== " " && asciiArt[i] !== "\n") {
        nonSpaceIndices.push(i);
      }
    }

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    let puddleInterval: ReturnType<typeof setInterval> | null = null;

    // Initial load CSS animation instead of JS rain
    asciiPre.style.animation = "retop-ascii-rise 0.5s linear forwards";

    // Kinetic Puddle Hover Logic - Awwards Level Fluid Ripples
    interface Ripple {
      x: number;
      y: number;
      timeCreated: number;
      energy: number;
    }
    let ripples: Ripple[] = [];
    const maxRipples = 25;
    const waveSpeed = 0.15; // pixels per ms
    const waveFrequency = 0.08;

    let lastMouseX = -1000;
    let lastMouseY = -1000;
    let lastTime = Date.now();

    const charW = 4.2; // Approx width of a 7px monospace char
    const charH = 7; // Line-height is 1 (7px)

    const updateHoverPuddle = (
      x: number,
      y: number,
      vx: number,
      vy: number,
    ) => {
      // Create ripple exactly at the letter's grid coordinates
      ripples.push({
        x,
        y,
        timeCreated: Date.now(),
        energy: Math.min(1.0, (Math.abs(vx) + Math.abs(vy)) * 0.2), // cap energy
      });
    };

    const originalLines = asciiArt.split("\n");

    document.addEventListener("mousemove", (e) => {
      const rect = asciiPre.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const now = Date.now();
      const dt = Math.max(1, now - lastTime);
      lastTime = now;

      if (lastMouseX !== -1000) {
        const dx = currentX - lastMouseX;
        const dy = currentY - lastMouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if mouse is touching an actual character ("water") with slight leniency
        const charX = Math.floor(currentX / charW);
        const charY = Math.floor(currentY / charH);
        let onWater = false;

        // Check current char and a few surrounding chars for leniency
        for (
          let cy = Math.max(0, charY - 1);
          cy <= Math.min(originalLines.length - 1, charY + 1);
          cy++
        ) {
          const line = originalLines[cy];
          for (
            let cx = Math.max(0, charX - 1);
            cx <= Math.min(line.length - 1, charX + 1);
            cx++
          ) {
            if (line[cx] !== " ") onWater = true;
          }
        }

        // Spawn a ripple if mouse moved enough AND is touching a character
        if (onWater && (distance > 8 || ripples.length === 0)) {
          const speed = distance / dt;
          const spawnEnergy = Math.min(50 + speed * 100, 150);

          ripples.push({
            x: currentX,
            y: currentY,
            timeCreated: now,
            energy: spawnEnergy,
          });

          if (ripples.length > maxRipples) {
            ripples.shift();
          }
          lastMouseX = currentX;
          lastMouseY = currentY;
        } else if (!onWater) {
          // Mouse is over empty space; just track it without spawning
          lastMouseX = currentX;
          lastMouseY = currentY;
        }
      } else {
        lastMouseX = currentX;
        lastMouseY = currentY;
      }

      if (!puddleInterval) {
        puddleInterval = setInterval(() => {
          const now = Date.now();
          // Filter dead ripples (live for 1 second)
          ripples = ripples.filter((r) => now - r.timeCreated < 1000);

          if (ripples.length === 0) {
            asciiPre.textContent = asciiArt;
            clearInterval(puddleInterval!);
            puddleInterval = null;
            return;
          }

          let newText = "";
          for (let y = 0; y < originalLines.length; y++) {
            const line = originalLines[y];
            const py = y * charH;

            let newLine = "";
            for (let x = 0; x < line.length; x++) {
              const char = line[x];
              if (char === " ") {
                newLine += " ";
                continue;
              }
              const px = x * charW;

              let totalWave = 0;
              let isAffected = false;

              for (let i = 0; i < ripples.length; i++) {
                const r = ripples[i];
                const dx = px - r.x;
                const dy = py - r.y;
                const distSq = dx * dx + dy * dy;

                if (distSq > 40000) continue; // max 200px radius

                const dist = Math.sqrt(distSq);
                const age = now - r.timeCreated;
                const waveRadius = age * waveSpeed;

                // Only characters near the expanding wave ring are affected
                const distanceToWave = Math.abs(dist - waveRadius);

                if (distanceToWave < 40) {
                  // thickness of the ripple
                  const phase = distanceToWave * waveFrequency;
                  // Quadratic falloff for smoother envelope
                  const amplitude = Math.pow(
                    Math.max(0, 1 - distanceToWave / 40),
                    2,
                  );
                  // Quadratic fade out as it ages
                  const lifeFade = Math.pow(Math.max(0, 1 - age / 1000), 2);

                  // Add to total wave interference
                  totalWave +=
                    Math.cos(phase) * amplitude * lifeFade * (r.energy / 100);
                  isAffected = true;
                }
              }

              if (isAffected && Math.abs(totalWave) > 0.2) {
                newLine += chars[Math.floor(Math.random() * chars.length)];
              } else {
                newLine += char;
              }
            }
            newText += newLine + "\n";
          }
          asciiPre.textContent = newText.slice(0, -1);
        }, 50); // 20fps
      }
    });

    document.addEventListener("mouseleave", () => {
      lastMouseX = -1000;
    });
  }

  // Apply Floating Labels to Username and Password
  const applyFloatingLabel = (inputId: string) => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (
      input &&
      !input.nextElementSibling?.classList.contains("retop-floating-label")
    ) {
      const placeholder = input.getAttribute("placeholder") || input.name;
      input.setAttribute("placeholder", " "); // Space enables :placeholder-shown CSS hack

      const label = document.createElement("label");
      label.className = "retop-floating-label";
      label.setAttribute("for", inputId);
      label.textContent = placeholder;

      input.parentElement?.insertBefore(label, input.nextSibling);
    }
  };
  applyFloatingLabel("username");
  applyFloatingLabel("password");

  try {
    const savedSettings = localStorage.getItem("retop-settings");
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);

      const MATERIAL_ACCENTS: Record<string, string> = {
        blue: "#2563eb",
        purple: "#6366f1",
        orange: "#ea580c",
        lime: "#059669",
        cyan: "#0e7490",
      };

      let baseColor =
        MATERIAL_ACCENTS[settings.accentColor] || MATERIAL_ACCENTS.blue;

      if (settings.randomAccentColor) {
        const hue = Math.floor(Math.random() * 360);
        baseColor = `hsl(${hue}, 70%, 45%)`;
      }

      document.documentElement.style.setProperty("--accent-base", baseColor);
      document.documentElement.setAttribute("data-theme", settings.themeMode);
    }
  } catch (err) {
    console.warn("[retop] Failed to load theme settings for login page:", err);
  }
};

const enhanceLegacyLogin = () => {
  console.log("[retop] Looking for CAPTCHA elements...");
  let attempts = 0;
  const maxAttempts = 300; // 30 seconds (300 * 100ms)

  // Save/Restore Username
  const usernameInput = document.getElementById("username") as HTMLInputElement;
  if (usernameInput) {
    const savedUser = localStorage.getItem("retop-saved-username");
    if (savedUser && !usernameInput.value) {
      usernameInput.value = savedUser;
    }
    usernameInput.addEventListener("blur", () => {
      if (usernameInput.value) {
        localStorage.setItem("retop-saved-username", usernameInput.value);
      }
    });
  }

  // Polling loop to handle VTOP's asynchronous CAPTCHA loading
  const findAndSolve = setInterval(async () => {
    attempts++;

    // Updated Selectors based on VTOP's current HTML structure
    const captchaBlock = document.getElementById("captchaBlock");
    injectLoginTheme();
    const captchaImg = captchaBlock?.querySelector("img") as HTMLImageElement;
    const captchaInput = document.getElementById(
      "captchaStr",
    ) as HTMLInputElement;

    // Check if image exists and actually has pixel data
    if (
      captchaBlock &&
      captchaImg &&
      captchaInput &&
      captchaImg.complete &&
      captchaImg.naturalWidth > 0
    ) {
      clearInterval(findAndSolve);
      console.log("[retop] CAPTCHA found. Initializing solver.");

      // Make it compact by physically restructuring the DOM safely
      const captchaInputGroup = captchaInput.closest(".input-group");

      if (
        captchaBlock &&
        captchaInput &&
        !document.getElementById("retop-captcha-container")
      ) {
        const flexContainer = document.createElement("div");
        flexContainer.id = "retop-captcha-container";

        const parent = captchaBlock.parentElement;
        if (parent) {
          parent.insertBefore(flexContainer, captchaBlock);

          // Move the input directly into flexContainer
          flexContainer.appendChild(captchaInput);

          // Move captchaBlock into flexContainer
          flexContainer.appendChild(captchaBlock);

          // Move the actual reload button into our container
          const reloadBtn = document.getElementById("button-addon2");
          if (reloadBtn) {
            flexContainer.appendChild(reloadBtn);
            reloadBtn.className = ""; // Strip native Bootstrap classes like .btn
            reloadBtn.classList.add("retop-reload-btn");
          } else {
            // Fallback if inside captchaBlock
            const fallbackReloadBtn = captchaBlock.querySelector("a, button");
            if (fallbackReloadBtn) {
              fallbackReloadBtn.className = "";
              fallbackReloadBtn.classList.add("retop-reload-btn");
            }
          }

          // Physically remove the old wrappers
          if (captchaInputGroup) {
            captchaInputGroup.remove();
          }
          const oldCol = document
            .getElementById("basic-addon3")
            ?.closest(".col-xs-12");
          if (oldCol) oldCol.remove();
        }
      }

      const solve = async (imgElement: HTMLImageElement) => {
        try {
          const solvedText = await autoSolveCaptcha(imgElement);
          if (solvedText && captchaInput) {
            captchaInput.value = solvedText;
            console.log("[retop] CAPTCHA Auto-Solved:", solvedText);
          }
        } catch (e) {
          console.error("[retop] Failed to solve CAPTCHA:", e);
        }
      };

      // 1. Solve the initial load
      await solve(captchaImg);

      // 2. Attach observer to the wrapper block, not the image.
      // VTOP uses innerHTML to replace the image, which destroys the old image node.
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes && mutation.addedNodes.length > 0) {
            const newImg = captchaBlock.querySelector(
              "img",
            ) as HTMLImageElement;
            if (newImg) {
              captchaInput.value = ""; // Clear old value immediately
              if (newImg.complete && newImg.naturalWidth > 0) {
                solve(newImg);
              } else {
                newImg.addEventListener("load", () => solve(newImg), {
                  once: true,
                });
              }
            }
          }
        });
      });

      observer.observe(captchaBlock, { childList: true, subtree: true });
    } else if (attempts >= maxAttempts) {
      clearInterval(findAndSolve);
      console.warn("[retop] CAPTCHA elements not found after 30 seconds.");
    }
  }, 100);
};

window.addEventListener("vtop-login-success", (e: any) => {
  vtopContext.authId = e.detail;
  document.body.classList.remove("show-legacy-ui");
  renderDashboard();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
