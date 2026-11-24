import { StateCreator } from 'zustand';
import { currentCampus } from '../../utils/campus';
import type { VtopCampus } from '../../utils/vtopClient';
import { VTOPNetwork } from '../../utils/network';
import { getCachedData, setCachedData } from '../../utils/cache';
import { parseStudentProfile, urlToBase64 } from '../../parsers/profile';
import { DataState } from '../dataStore';
import { getStorageData, setStorageData } from '../../utils/storageAdapter';
import {
  getUserProfileImage,
  saveUserProfileImage,
} from '../../utils/pinSecurity';

export interface UserProfileData {
  name: string;
  regNo: string;
  profileImgBase64?: string;
  campus?: VtopCampus;
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
  user: { name: 'Student', regNo: '...' },
  setUser: (user) => set({ user }),

  fetchUserProfile: async (network) => {
    try {
      const currentAuthId = network.authorizedID || get().user.regNo;
      if (currentAuthId && currentAuthId !== '...') {
        // Fast restore from user-scoped profile cache
        getCachedData<UserProfileData>(
          `${currentAuthId}_user_basic_profile`,
        ).then((cached) => {
          if (cached && cached.regNo === currentAuthId) {
            const { profileImgBase64: _cachedPhoto, ...profile } = cached;
            set((state) => ({
              user: {
                ...state.user,
                ...profile,
              },
            }));
          }
        });
      }

      const html = await network.fetchWithCache(
        'student_profile_data',
        async () => {
          return await network.fetchFragment(
            'studentsRecord/StudentProfileAllView',
          );
        },
      );
      const profile =
        typeof html === 'string' ? parseStudentProfile(html) : html;
      if (profile?.basic?.name) {
        const regNo = profile.basic.regNo || currentAuthId || get().user.regNo;
        const campus = currentCampus();

        // 1. Prioritize freshly scraped photo from profile page, then active user state if regNo matches
        let profileImgBase64: string | undefined = profile.basic.photoUrl;
        if (profileImgBase64 && !profileImgBase64.startsWith('data:image')) {
          try {
            const converted = await urlToBase64(profileImgBase64);
            if (converted && converted.startsWith('data:image')) {
              profileImgBase64 = converted;
            }
          } catch {}
        }
        // 2. Check the encrypted scoped photo strictly for THIS user
        if (!profileImgBase64 || !profileImgBase64.startsWith('data:image')) {
          try {
            const storedImg = await getUserProfileImage(regNo);
            if (storedImg && typeof storedImg === 'string') {
              profileImgBase64 = storedImg;
            }
          } catch {}
        }

        const newUser: UserProfileData = {
          name: profile.basic.name,
          regNo: profile.basic.regNo || regNo,
          profileImgBase64: profileImgBase64 || '',
          campus,
        };

        set({ user: newUser });
        const { profileImgBase64: _photo, ...profileForCache } = newUser;
        setCachedData(`${regNo}_user_basic_profile`, profileForCache);

        if (profileImgBase64 && profileImgBase64.startsWith('data:image')) {
          saveUserProfileImage(regNo, profileImgBase64).catch(() => {});
        }

        try {
          const rawStore = await getStorageData(['retop_cached_users']);
          const raw = rawStore['retop_cached_users'];
          let users: any[] = Array.isArray(raw)
            ? raw.map((u: any) => ({ ...u, profileImgBase64: '' }))
            : [];
          const idx = users.findIndex((u: any) => u.regNo === regNo);
          const userEntry = {
            regNo,
            username: regNo,
            name: profile.basic.name,
            profileImgBase64: '',
            campus,
            lastActive: Date.now(),
          };
          if (idx >= 0) users[idx] = userEntry;
          else users.push(userEntry);

          await setStorageData({
            retop_lastAuthId: regNo,
            retop_lastName: profile.basic.name,
            retop_last_campus: campus,
            retop_active_user: regNo,
            retop_cached_users: users,
          });
        } catch {}
      }
    } catch (err) {
      console.warn('Failed to fetch user profile', err);
    }
  },
});
