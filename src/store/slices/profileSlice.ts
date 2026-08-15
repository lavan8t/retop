import { StateCreator } from "zustand";
import { VTOPNetwork } from "../../utils/network";
import { getCachedData, setCachedData } from "../../utils/cache";
import { parseStudentProfile } from "../../parsers/profile";
import { DataState } from "../dataStore";
import { get as idbGet, set as idbSet } from "idb-keyval";

export interface UserProfileData {
  name: string;
  regNo: string;
  profileImgBase64?: string;
  campus?: "chennai" | "vellore";
}

export interface ProfileSlice {
  user: UserProfileData;
  setUser: (user: UserProfileData) => void;
  fetchUserProfile: (network: VTOPNetwork) => Promise<void>;
}

export const createProfileSlice: StateCreator<DataState, [], [], ProfileSlice> = (set, get) => ({
  user: { name: "Student", regNo: "..." },
  setUser: (user) => set({ user }),

  fetchUserProfile: async (network) => {
    try {
      const currentAuthId = network.authorizedID || get().user.regNo;
      if (currentAuthId && currentAuthId !== "...") {
        // Fast restore from user-scoped profile cache
        getCachedData<UserProfileData>(`${currentAuthId}_user_basic_profile`).then((cached) => {
          if (cached && cached.regNo === currentAuthId) {
            set((state) => ({
              user: {
                ...state.user,
                ...cached,
                profileImgBase64: cached.profileImgBase64 || state.user.profileImgBase64,
              },
            }));
          }
        });
      }

      const html = await network.fetchWithCache(
        "student_profile_data",
        async () => {
          return await network.fetchFragment(
            "studentsRecord/StudentProfileAllView",
          );
        },
      );
      const profile = parseStudentProfile(html);
      if (profile?.basic?.name) {
        const regNo = profile.basic.regNo || currentAuthId || get().user.regNo;
        const isChennai = typeof window !== "undefined" && window.location.hostname.includes("vtopcc");
        const campus: "chennai" | "vellore" = isChennai ? "chennai" : "vellore";
        
        // 1. Check existing stored base64 (Zustand -> LocalStorage -> Chrome Storage)
        let profileImgBase64 = get().user.profileImgBase64;
        if (!profileImgBase64 || !profileImgBase64.startsWith("data:image")) {
          try {
            const localStored = localStorage.getItem(`${regNo}_profileImage`);
            if (localStored && localStored.startsWith("data:image")) {
              profileImgBase64 = localStored;
            }
          } catch {}
        }

        // 2. Only fetch over network IF NO BASE64 IS STORED FOR THIS USER
        if (!profileImgBase64 && regNo !== "...") {
          const isOffline =
            (typeof window !== "undefined" && (window as any).__RETOP_OFFLINE__) ||
            (typeof window !== "undefined" && window.location.hostname.includes("web.app")) ||
            (typeof window !== "undefined" && window.location.hostname === "localhost") ||
            (typeof window !== "undefined" && window.location.protocol.includes("-extension:"));

          if (!isOffline) {
            try {
              const imgRes = await fetch(`/vtop/users/image/?id=${encodeURIComponent(regNo)}`);
              if (imgRes.ok) {
                const blob = await imgRes.blob();
                profileImgBase64 = await new Promise<string>((resolve) => {
                  const url = URL.createObjectURL(blob);
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                      ctx.drawImage(img, 0, 0);
                      resolve(canvas.toDataURL("image/webp", 0.85));
                    } else {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result as string);
                      reader.readAsDataURL(blob);
                    }
                    URL.revokeObjectURL(url);
                  };
                  img.onerror = () => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                    URL.revokeObjectURL(url);
                  };
                  img.src = url;
                });
              }
            } catch (e) {
              console.warn("Failed to convert profile image to base64", e);
            }
          }
        }

        const newUser: UserProfileData = {
          name: profile.basic.name,
          regNo: regNo,
          profileImgBase64: profileImgBase64 || "",
          campus,
        };

        set({ user: newUser });
        setCachedData(`${regNo}_user_basic_profile`, newUser);
        if (profileImgBase64) {
          try {
            localStorage.setItem(`${regNo}_profileImage`, profileImgBase64);
          } catch {}
        }

        try {
          const raw = await idbGet("retop_cached_users");
          let users: any[] = Array.isArray(raw) ? raw : [];
          const idx = users.findIndex((u: any) => u.regNo === regNo);
          const userEntry = {
            regNo,
            username: regNo,
            name: profile.basic.name,
            profileImgBase64: profileImgBase64 || "",
            campus,
            lastActive: Date.now(),
          };
          if (idx >= 0) users[idx] = userEntry;
          else users.push(userEntry);

          await Promise.all([
            idbSet(`${regNo}_profileImage`, profileImgBase64 || ""),
            idbSet("retop_lastAuthId", regNo),
            idbSet("retop_lastName", profile.basic.name),
            idbSet("retop_last_campus", campus),
            idbSet("retop_active_user", regNo),
            idbSet("retop_cached_users", users),
          ]);
        } catch {}
      }
    } catch (err) {
      console.warn("Failed to fetch user profile", err);
    }
  },
});
