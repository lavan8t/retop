import { renderDashboard } from "./pages/app";
import "./input.css";

const initializeOfflineMode = () => {
  chrome.storage.local.get(["retop_lastAuthId", "retop_lastName"], (res) => {
    const authId = res.retop_lastAuthId as string;
    const name = res.retop_lastName as string;

    if (!authId) {
      document.body.innerHTML = `
        <div class="h-screen w-screen bg-[#0f172a] flex items-center justify-center p-8">
          <div class="flex flex-col items-center gap-4 text-center">
            <span class="material-symbols-rounded text-6xl text-white/50">cloud_off</span>
            <h2 class="text-2xl font-bold text-white">Offline Mode Unavailable</h2>
            <p class="text-white/70 max-w-md">No cached data found. You must login to VTOP at least once to use offline mode.</p>
          </div>
        </div>
      `;
      return;
    }

    // Mock authId input for app.tsx to read
    const input = document.createElement("input");
    input.id = "authorizedIDX";
    input.value = authId;
    document.body.appendChild(input);

    // Mock the user profile header for scrapeUserProfile to read
    const header = document.createElement("div");
    header.className = "navbar-text text-light small fw-bold";
    header.textContent = `${authId} - ${name || "Offline"} (OFFLINE CACHE)`;
    document.body.appendChild(header);

    // Mock CSRF
    const script = document.createElement("script");
    script.innerHTML = `var csrfValue = "offline_csrf";`;
    document.body.appendChild(script);

    // Render the dashboard using the existing bridge logic
    renderDashboard();

    // Add Offline Banner
    const banner = document.createElement("div");
    banner.className = "fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#3b82f6] text-white px-4 py-2 rounded-full font-bold text-sm shadow-xl flex items-center gap-2 pointer-events-none";
    banner.style.zIndex = "999999";
    banner.innerHTML = `<span class="material-symbols-rounded" style="font-size: 18px;">cloud_off</span> Viewing Offline Cache`;
    document.body.appendChild(banner);
  });
};

initializeOfflineMode();
