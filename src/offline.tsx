import { renderDashboard } from "./pages/app";

const initializeOfflineMode = () => {
  chrome.storage.local.get(["retop_lastAuthId", "retop_lastName", "retop_profileImage"], (res) => {
    const authId = res.retop_lastAuthId as string;
    const name = res.retop_lastName as string;
    const profileImage = res.retop_profileImage as string;

    if (!authId) {
      document.body.innerHTML = `
        <div class="h-screen w-screen bg-[#0f172a] flex items-center justify-center p-8">
          <div class="flex flex-col items-center gap-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="1em" height="1em" fill="currentColor" class="text-6xl text-white/50"><path d="M260-126q-105 0-178-73T9-377q0-81 50-150.5T189-615q1-2 1-8.5t1-8.5L60-764q-14-14-13.5-33T61-830t33-14 33 14l713 713q14 14 13.5 33T839-51t-33 14-33-14l-76-75zm625-59L301-769q35-28 83-43.5t96-15.5q122 0 210 83t99 204q72 19 117 76t45 131q0 45-19.5 85.5T885-185"></path></svg>
            <h2 class="text-2xl font-bold text-content-inverse">Offline Mode Unavailable</h2>
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
    header.textContent = `${authId} (Offline) - ${name || "Offline"} )`;
    document.body.appendChild(header);

    if (profileImage) {
      const img = document.createElement("img");
      img.id = "retop-profile-image-mock";
      img.src = profileImage;
      img.style.display = "none";
      document.body.appendChild(img);
    }

    // Mock CSRF
    (window as any).csrfValue = "offline_csrf";

    // Render the dashboard using the existing bridge logic
    (window as any).__RETOP_OFFLINE__ = true;
    
    renderDashboard();

    // Add Offline Banner
    const banner = document.createElement("div");
    banner.className = "fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#3b82f6] text-content-inverse px-4 py-2 rounded-full font-bold text-sm shadow-xl flex items-center gap-2 pointer-events-none";
    banner.style.zIndex = "999999";
    banner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="1em" height="1em" fill="currentColor" style="font-size: 18px;"><path d="M260-126q-105 0-178-73T9-377q0-81 50-150.5T189-615q1-2 1-8.5t1-8.5L60-764q-14-14-13.5-33T61-830t33-14 33 14l713 713q14 14 13.5 33T839-51t-33 14-33-14l-76-75zm625-59L301-769q35-28 83-43.5t96-15.5q122 0 210 83t99 204q72 19 117 76t45 131q0 45-19.5 85.5T885-185"></path></svg> Viewing Offline Cache`;
    document.body.appendChild(banner);
  });
};

initializeOfflineMode();
