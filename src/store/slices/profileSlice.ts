import { StateCreator } from "zustand";
import { VTOPNetwork } from "../../utils/network";
import { getCachedData, setCachedData } from "../../utils/cache";
import { parseStudentProfile } from "../../parsers/profile";
import { DataState } from "../dataStore";
import { getStorageData, setStorageData } from "../../utils/storageAdapter";

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

export const createProfileSlice: StateCreator<
  DataState,
  [],
  [],
  ProfileSlice
> = (set, get) => ({
  user: { name: "Student", regNo: "..." },
  setUser: (user) => set({ user }),

  fetchUserProfile: async (network) => {
    try {
      const currentAuthId = network.authorizedID || get().user.regNo;
      if (currentAuthId && currentAuthId !== "...") {
        // Fast restore from user-scoped profile cache
        getCachedData<UserProfileData>(`${currentAuthId}_user_basic_profile`).then(
          (cached) => {
            if (cached && cached.regNo === currentAuthId) {
              set((state) => ({
                user: {
                  ...state.user,
                  ...cached,
                  profileImgBase64:
                    cached.profileImgBase64 || state.user.profileImgBase64,
                },
              }));
            }
          },
        );
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
        const isChennai =
          typeof window !== "undefined" &&
          window.location.hostname.includes("vtopcc");
        const campus: "chennai" | "vellore" = isChennai ? "chennai" : "vellore";

        // 1. Prioritize freshly scraped photo from profile page, then active user state if regNo matches
        let profileImgBase64: string | undefined = profile.basic.photoUrl;
        if (!profileImgBase64 && get().user.regNo === regNo) {
          profileImgBase64 = get().user.profileImgBase64;
        }

        // 2. Check existing stored base64 image strictly for THIS user
        if (!profileImgBase64 || !profileImgBase64.startsWith("data:image")) {
          try {
            const rawStored = await getStorageData([`${regNo}_profileImage`]);
            if (
              rawStored[`${regNo}_profileImage`] &&
              typeof rawStored[`${regNo}_profileImage`] === "string"
            ) {
              profileImgBase64 = rawStored[`${regNo}_profileImage`];
            }
          } catch {}
        }

        // 3. Fetch over network if not available and online
        if (!profileImgBase64 && regNo !== "...") {
          const isOffline =
            (typeof window !== "undefined" &&
              (window as any).__RETOP_OFFLINE__) ||
            (typeof window !== "undefined" &&
              window.location.hostname.includes("web.app")) ||
            (typeof window !== "undefined" &&
              window.location.hostname === "localhost") ||
            (typeof window !== "undefined" &&
              window.location.protocol.includes("-extension:"));

          if (!isOffline) {
            try {
              const imgRes = await fetch(
                `/vtop/users/image/?id=${encodeURIComponent(regNo)}`,
              );
              if (imgRes.ok) {
                const blob = await imgRes.blob();
                profileImgBase64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = () => resolve("");
                  reader.readAsDataURL(blob);
                });
              }
            } catch {}
          }
        }

        const newUser: UserProfileData = {
          name: profile.basic.name,
          regNo: profile.basic.regNo || regNo,
          profileImgBase64: profileImgBase64 || "",
          campus,
        };

        set({ user: newUser });
        setCachedData(`${regNo}_user_basic_profile`, newUser);

        try {
          const rawStore = await getStorageData(["retop_cached_users"]);
          const raw = rawStore["retop_cached_users"];
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

          await setStorageData({
            [`${regNo}_profileImage`]: profileImgBase64 || "",
            retop_lastAuthId: regNo,
            retop_lastName: profile.basic.name,
            retop_profileImage: profileImgBase64 || "",
            retop_last_campus: campus,
            retop_active_user: regNo,
            retop_cached_users: users,
          });
        } catch {}
      }
    } catch (err) {
      console.warn("Failed to fetch user profile", err);
    }
  },
});
