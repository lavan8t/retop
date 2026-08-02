export interface BackupData {
  version: string;
  timestamp: number;
  settings: any;
}

export const DEFAULT_GOOGLE_CLIENT_ID =
  "762947045457-ufteneo8aukdj9ga49ki6kj8089djh0h.apps.googleusercontent.com";

export const getAuthToken = (
  clientId: string = DEFAULT_GOOGLE_CLIENT_ID,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.identity) {
      return reject(new Error("chrome.identity API unavailable"));
    }

    chrome.identity.getAuthToken({ interactive: true }, (token: any) => {
      const tokenStr = typeof token === "string" ? token : token?.token;
      if (!chrome.runtime.lastError && tokenStr) {
        return resolve(tokenStr);
      }

      if (clientId && clientId.trim().length > 0) {
        const redirectUri = chrome.identity.getRedirectURL();
        const scopes = encodeURIComponent(
          "https://www.googleapis.com/auth/drive.appdata",
        );
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}`;

        chrome.identity.launchWebAuthFlow(
          { url: authUrl, interactive: true },
          (redirectUrl) => {
            if (chrome.runtime.lastError || !redirectUrl) {
              reject(
                new Error(
                  chrome.runtime.lastError?.message || "Sign in cancelled",
                ),
              );
            } else {
              const hash = new URL(redirectUrl).hash.substring(1);
              const params = new URLSearchParams(hash);
              const accessToken = params.get("access_token");
              if (accessToken) {
                resolve(accessToken);
              } else {
                reject(new Error("No access token returned from Google"));
              }
            }
          },
        );
      } else {
        reject(
          new Error(
            "Google OAuth Client ID required. Set Client ID in settings or extension configuration.",
          ),
        );
      }
    });
  });
};

export const searchBackupFile = async (
  token: string,
): Promise<string | null> => {
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D%27retop_settings_backup.json%27+and+trashed%3Dfalse",
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error(`Drive search failed: ${res.statusText}`);
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
};

export const uploadBackup = async (
  settingsData: any,
  clientId?: string,
): Promise<void> => {
  if (typeof chrome !== "undefined" && (!chrome.identity || !chrome.identity.launchWebAuthFlow) && chrome.runtime?.sendMessage) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "UPLOAD_DRIVE_BACKUP", settingsData, clientId },
        (res) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (res && res.success) {
            resolve();
          } else {
            reject(new Error(res?.error || "Drive backup failed"));
          }
        },
      );
    });
  }

  const token = await getAuthToken(clientId);
  const fileContent = JSON.stringify({
    version: "2.0",
    timestamp: Date.now(),
    settings: settingsData,
  });

  const searchRes = await fetch(
    "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='retop_settings_backup.json'",
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  const searchData = await searchRes.json();
  const existingFile = searchData.files && searchData.files[0];

  const metadata = {
    name: "retop_settings_backup.json",
    parents: existingFile ? [] : ["appDataFolder"],
  };

  const formData = new FormData();
  formData.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  formData.append(
    "file",
    new Blob([fileContent], { type: "application/json" }),
  );

  let uploadUrl =
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
  let method = "POST";

  if (existingFile) {
    uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
    method = "PATCH";
  }

  const uploadRes = await fetch(uploadUrl, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error(`Drive Upload Error: ${uploadRes.statusText}`);
  }
};

export const downloadBackup = async (
  clientId?: string,
): Promise<BackupData | null> => {
  if (typeof chrome !== "undefined" && (!chrome.identity || !chrome.identity.launchWebAuthFlow) && chrome.runtime?.sendMessage) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "DOWNLOAD_DRIVE_BACKUP", clientId },
        (res) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (res && res.success) {
            resolve(res.data);
          } else {
            reject(new Error(res?.error || "Drive restore failed"));
          }
        },
      );
    });
  }

  const token = await getAuthToken(clientId);
  const searchRes = await fetch(
    "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='retop_settings_backup.json'",
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  const searchData = await searchRes.json();
  const existingFile = searchData.files && searchData.files[0];

  if (!existingFile) {
    return null;
  }

  const fileRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!fileRes.ok) {
    throw new Error(`Drive Download Error: ${fileRes.statusText}`);
  }

  const data: BackupData = await fileRes.json();
  return data;
};
