import { StateCreator } from "zustand";
import { VTOPNetwork } from "../../utils/network";
import { getCachedData, setCachedData } from "../../utils/cache";
import { parseStudentProfile } from "../../parsers/profile";
import { DataState } from "../dataStore";

export interface ProfileSlice {
  user: { name: string; regNo: string; profileImgBase64?: string };
  setUser: (user: { name: string; regNo: string; profileImgBase64?: string }) => void;
  fetchUserProfile: (network: VTOPNetwork) => Promise<void>;
}

export const createProfileSlice: StateCreator<DataState, [], [], ProfileSlice> = (set, get) => ({
  user: { name: "Student", regNo: "..." },
  setUser: (user) => set({ user }),

  fetchUserProfile: async (network) => {
    try {
      getCachedData<{ name: string; regNo: string; profileImgBase64?: string }>("user_basic_profile").then((cached) => {
        if (cached) set({ user: cached });
      });

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
        const regNo = profile.basic.regNo || get().user.regNo;
        let profileImgBase64 = get().user.profileImgBase64;
        
        if (regNo !== "...") {
          try {
            const imgRes = await fetch(`/vtop/users/image/?id=${regNo}`);
            const blob = await imgRes.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            profileImgBase64 = await new Promise((res) => {
              reader.onloadend = () => res(reader.result as string);
            });
          } catch (e) {
            console.warn("Failed to fetch profile image for cache", e);
          }
        }

        const newUser = {
          name: profile.basic.name,
          regNo: regNo,
          profileImgBase64,
        };

        set({ user: newUser });
        
        setCachedData("user_basic_profile", newUser);
        
        if (typeof chrome !== "undefined" && chrome.storage) {
          chrome.storage.local.set({
            "retop_lastAuthId": regNo,
            "retop_lastName": profile.basic.name,
            "retop_profileImage": profileImgBase64 || "",
          });
        }
      }
    } catch (err) {
      console.warn("Failed to fetch user profile", err);
    }
  },
});
