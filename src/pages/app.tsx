import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useDataStore } from '../store/dataStore';
import { ProfileMenu } from '../components/profile-menu';
import {
  initializeContainer,
  getAppRoot,
  setUIVisibility,
  revealLegacyUI,
  removeSplashScreen,
} from '../utils/bridge';
import { VTOPNetwork } from '../utils/network';
import { getCachedData, setCachedData } from '../utils/cache';
import {
  getStorageData,
  setStorageData,
  removeStorageKeys,
} from '../utils/storageAdapter';
import { scrapeMenu, scrapeUserProfile } from '../parsers/menu';
import { fixBase64Image, urlToBase64 } from '../parsers/profile';
import {
  saveUserProfileImage,
  getUserProfileImage,
} from '../utils/pinSecurity';
import { scrapeSpotlight } from '../parsers/spotlight';
import {
  QuickLink,
  MenuCategory,
  ViewType,
  SpotlightCategoryGroup,
} from '../types/vtop';
import { getDestinationView, getSavedView } from '../utils/routes';

import { TopBar } from '../components/layout/TopBar';
import { ContentRouter } from '../components/layout/ContentRouter';
import { GlobalDADropZone } from '../components/ui/GlobalDADropZone';
import { AlertDialogManager } from '../components/ui/AlertDialog';

import { FloatingViewToggle } from '../components/timetable/FloatingViewToggle';
import { useSettings, applyTheme } from '../utils/settings-store';
import { LegacyReturnButton } from '../components/LegacyReturnButton';
import { SnackbarManager } from '../components/ui/Snackbar';
import { isTypingEvent } from '../utils/keyboard';
import {
  confirmNavigation,
  getActiveNavigationGuard,
} from '../utils/navigationGuard';

const findLegacyTarget = (title: string, url?: string): HTMLElement | null => {
  const links = Array.from(
    document.querySelectorAll(
      'a, button, [onclick], .nav-link, .menu-item, [data-url], li',
    ),
  );
  const cleanTitle = title.trim().toLowerCase();
  const urlEnd = url ? url.split('/').pop()!.toLowerCase() : '';

  const synonyms: Record<string, string[]> = {
    'login id': [
      'update loginid',
      'update login id',
      'loginid',
      'login id',
      'user/updateloginid',
      'updateloginid',
    ],
    'update loginid': [
      'update loginid',
      'update login id',
      'loginid',
      'login id',
      'user/updateloginid',
      'updateloginid',
    ],
    password: [
      'change password',
      'password',
      'user/changepassword',
      'changepassword',
    ],
    'change password': [
      'change password',
      'password',
      'user/changepassword',
      'changepassword',
    ],
    profile: [
      'student profile all view',
      'profile',
      'studentsrecord/studentprofileallview',
      'studentprofileallview',
    ],
    'student profile all view': [
      'student profile all view',
      'profile',
      'studentsrecord/studentprofileallview',
      'studentprofileallview',
    ],
    'bank info': [
      'student bank info',
      'bank info',
      'fees/studentbankinfo',
      'studentbankinfo',
    ],
    'student bank info': [
      'student bank info',
      'bank info',
      'fees/studentbankinfo',
      'studentbankinfo',
    ],
    'backup codes': ['backup codes', 'user/backupcodes', 'backupcodes'],
  };

  const targetSynonyms = synonyms[cleanTitle] || [cleanTitle];

  return links.find((el) => {
    const dataUrl = (
      el.getAttribute('data-url') ||
      el.getAttribute('href') ||
      el.getAttribute('onclick') ||
      ''
    ).toLowerCase();

    if (url && dataUrl.includes(url.toLowerCase())) return true;
    if (urlEnd && dataUrl.includes(urlEnd)) return true;

    const txt = (el.textContent || (el as HTMLElement).innerText || '')
      .trim()
      .toLowerCase();

    if (!txt) return false;

    for (const syn of targetSynonyms) {
      if (txt === syn || txt.includes(syn) || syn.includes(txt)) return true;
      if (dataUrl.includes(syn)) return true;
    }

    return false;
  }) as HTMLElement | null;
};

const navigateLegacy = (title: string, url?: string) => {
  const attemptFindAndClick = (attemptsLeft: number) => {
    // VTOP's own handlers can throw. That must not escape into the global
    // error net, which would tear the whole page down.
    try {
      const target = findLegacyTarget(title, url);
      if (target) {
        const href = target.getAttribute('href') || '';
        const onclick = target.getAttribute('onclick') || '';
        if (href.toLowerCase().startsWith('javascript:')) {
          const jsCode = href.slice(11);
          window.dispatchEvent(
            new CustomEvent('retop-execute-legacy', {
              detail: { code: jsCode },
            }),
          );
        } else if (onclick) {
          window.dispatchEvent(
            new CustomEvent('retop-execute-legacy', {
              detail: { code: onclick },
            }),
          );
        } else {
          target.click();
        }
        return true;
      }
    } catch (err) {
      console.warn('[retop] Legacy navigation failed:', title, err);
      return false;
    }

    if (attemptsLeft > 0) {
      setTimeout(() => attemptFindAndClick(attemptsLeft - 1), 150);
    } else {
      console.warn('Legacy link not found for:', title, url);
    }
    return false;
  };

  attemptFindAndClick(33);
};
import { useAppStore } from '../store/appStore';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { registerAppUnmount } from '../utils/teardown';

export function renderDashboard() {
  initializeContainer();
  const rootEl = getAppRoot();
  if (rootEl) {
    if ((rootEl as any)._reactRoot) {
      (rootEl as any)._reactRoot.render(
        <ErrorBoundary variant="fullscreen" name="retop App">
          <DashboardApp />
        </ErrorBoundary>,
      );
    } else {
      const root = createRoot(rootEl);
      (rootEl as any)._reactRoot = root;
      // Let the teardown unmount the app. Without this the React tree keeps
      // running after retop hands VTOP back: its timers keep firing and
      // re-inject retop's search box into the native page.
      registerAppUnmount(() => root.unmount());
      root.render(
        <ErrorBoundary variant="fullscreen" name="retop App">
          <DashboardApp />
        </ErrorBoundary>,
      );
    }
  }
}

export const DashboardApp = () => {
  useEffect(() => {
    removeSplashScreen();
  }, []);

  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [spotlightCategories, setSpotlightCategories] = useState<
    SpotlightCategoryGroup[]
  >([]);
  const [isOmniboxOpen, setIsOmniboxOpen] = useState(false);
  const [omniboxInitial, setOmniboxInitial] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { settings, updateSetting } = useSettings();

  const {
    isModernUI,
    setIsModernUI,
    isPeeking,
    setIsPeeking,
    currentView,
    setCurrentView,
    ttViewMode,
    setTtViewMode,
  } = useAppStore();

  const [contentTitle, setContentTitle] = useState('');
  const [hasSlideCompleted, setHasSlideCompleted] = useState(false);

  const isStandalone =
    typeof window !== 'undefined' &&
    (!!(window as any).__RETOP_OFFLINE__ ||
      !!(window as any).__RETOP_STANDALONE__ ||
      window.location.pathname.includes('offline') ||
      window.location.hostname.includes('web.app') ||
      window.location.hostname.includes('localhost') ||
      window.location.hostname === '127.0.0.1' ||
      !window.location.hostname.includes('vit.ac.in'));

  useEffect(() => {
    if (isStandalone) {
      setHasSlideCompleted(true);
    } else if (!isModernUI) {
      setHasSlideCompleted(false);
    }
  }, [isModernUI, isStandalone]);

  const {
    user,
    setUser,
    status,
    stats,
    attendance,
    assignments,
    events,
    upcoming,
    ttSemesters,
    ttSelectedSem,
    ttCourses,
    ttLoading,
    cpSelectedSem,
    setCpSelectedSem,
    calSemesters,
    setCalSemesters,
    calSelectedSem,
    setCalSelectedSem,
    calClassGroups,
    calSelectedGroup,
    setCalSelectedGroup,
    calGridData,
    fetchDashboardData,
    loadTimetable,
    syncDashboard,
  } = useDataStore();

  const networkRef = useRef<VTOPNetwork | null>(null);
  const csrfRef = useRef<string>('');
  const authIdRef = useRef<string>('');

  const isOmniboxOpenRef = useRef(isOmniboxOpen);
  isOmniboxOpenRef.current = isOmniboxOpen;

  const currentViewRef = useRef(currentView);
  currentViewRef.current = currentView;

  const handleSyncCurrentView = async () => {
    if (!networkRef.current || useDataStore.getState().isSyncing) return;
    const net = networkRef.current;
    const appState = useAppStore.getState();
    const dataState = useDataStore.getState();
    const view = appState.currentView;

    useDataStore.setState({ isSyncing: true, status: 'Syncing...' });

    try {
      if (view === 'marks') {
        const sem = appState.marksSelectedSem || dataState.ttSelectedSem;
        if (sem) {
          const isPast =
            appState.marksSemesters.length > 0 &&
            sem !== appState.marksSemesters[0].id;
          await net.getStudentMarks(sem, true, isPast);
          window.dispatchEvent(
            new CustomEvent('retop-refresh-marks', { detail: { sem } }),
          );
        } else {
          await net.getMarksView(true);
        }
      } else if (view === 'grades') {
        const sem = appState.gradesSelectedSem || dataState.ttSelectedSem;
        if (sem) {
          const isPast =
            appState.gradesSemesters.length > 0 &&
            sem !== appState.gradesSemesters[0].id;
          await net.getStudentGrades(sem, true, isPast);
          window.dispatchEvent(
            new CustomEvent('retop-refresh-grades', { detail: { sem } }),
          );
        } else {
          await net.getGradesView(true);
        }
      } else if (view === 'timetable') {
        const sem = dataState.ttSelectedSem;
        if (sem && csrfRef.current && authIdRef.current) {
          await dataState.loadTimetable(
            net,
            csrfRef.current,
            authIdRef.current,
            sem,
            true,
          );
        }
      } else if (view === 'digitalAssignments') {
        const sem = dataState.daSelectedSem || dataState.ttSelectedSem;
        if (sem) {
          await net.getDACourses(sem, true);
          window.dispatchEvent(
            new CustomEvent('retop-refresh-da', { detail: { sem } }),
          );
        }
      } else if (view === 'curriculum') {
        await net.fetchWithCache(
          'curriculum_dashboard',
          () => net.fetchFragment('academics/common/Curriculum'),
          true,
        );
        window.dispatchEvent(new CustomEvent('retop-refresh-curriculum'));
      } else if (view === 'examSchedule') {
        const sem = dataState.examSelectedSem;
        if (sem) {
          await dataState.fetchExamSchedule(net, sem);
        } else {
          await net.getExamScheduleView();
        }
        window.dispatchEvent(new CustomEvent('retop-refresh-exams'));
      } else if (view === 'calendar') {
        const sem = dataState.calSelectedSem || dataState.ttSelectedSem;
        const group = dataState.calSelectedGroup;
        if (sem && group && dataState.calAvailableMonths.length > 0) {
          await dataState.fetchCalendarGrid(
            net,
            sem,
            group,
            dataState.calAvailableMonths,
            true,
          );
        } else if (sem) {
          await dataState.fetchCalendarMonthsAndGroups(net, sem);
        }
        window.dispatchEvent(new CustomEvent('retop-refresh-calendar'));
      } else if (view === 'attendance') {
        const sem = dataState.attSelectedSem || dataState.ttSelectedSem;
        if (sem) {
          await dataState.fetchDetailedAttendance(net, sem, true);
        }
        window.dispatchEvent(new CustomEvent('retop-refresh-attendance'));
      } else if (view === 'profile') {
        await net.fetchWithCache(
          'student_profile_data',
          () => net.fetchFragment('studentsRecord/StudentProfileAllView'),
          true,
        );
        window.dispatchEvent(new CustomEvent('retop-refresh-profile'));
      } else if (view === 'coursePage') {
        window.dispatchEvent(new CustomEvent('retop-refresh-coursepage'));
      } else if (view === 'lateHour') {
        await Promise.all([
          net.getLateHourStatus(true),
          net.getLateHourHistory(true),
        ]).catch(console.warn);
        window.dispatchEvent(new CustomEvent('retop-refresh-late-hour'));
      } else {
        if (csrfRef.current && authIdRef.current) {
          await dataState.syncDashboard(
            net,
            csrfRef.current,
            authIdRef.current,
          );
        }
      }
      useDataStore.setState({ lastSyncTime: Date.now(), status: 'Online' });
    } catch (e) {
      console.error('View sync error:', e);
      useDataStore.setState({ status: 'Sync Failed' });
    } finally {
      useDataStore.setState({ isSyncing: false });
    }
  };

  const pinnedLinks = settings.pinnedLinks || [];

  const handleTogglePin = (link: QuickLink) => {
    const dest = getDestinationView(link);
    const isAlreadyPinned = pinnedLinks.some(
      (p) =>
        p.url === link.url ||
        (dest !== 'content' && getDestinationView(p) === dest),
    );

    if (isAlreadyPinned) {
      const newPins = pinnedLinks.filter(
        (p) =>
          p.url !== link.url &&
          (dest === 'content' || getDestinationView(p) !== dest),
      );
      updateSetting('pinnedLinks', newPins);
    } else {
      if (pinnedLinks.length >= 9) {
        window.dispatchEvent(
          new CustomEvent('retop-toast', {
            detail: {
              message: 'Maximum 9 pinned pages allowed.',
              type: 'warning',
            },
          }),
        );
        return;
      }
      updateSetting('pinnedLinks', [...pinnedLinks, link]);
    }
  };

  useEffect(() => {
    if (status !== 'Initializing...' && status !== 'Syncing...') {
      setIsInitialLoad(false);
    }
  }, [status]);

  const navigateToView = async (view: ViewType, replace: boolean = false) => {
    if (view === currentView) return;
    const canProceed = await confirmNavigation();
    if (!canProceed) return;

    if (replace) {
      window.history.replaceState(
        { view },
        '',
        window.location.pathname + window.location.search,
      );
    } else {
      window.history.pushState(
        { view },
        '',
        window.location.pathname + window.location.search,
      );
    }
    setCurrentView(view);
    sessionStorage.setItem('vtop-retop-view', view);
  };

  const handleBack = async () => {
    const canProceed = await confirmNavigation();
    if (!canProceed) return;

    if (
      window.history.state?.view &&
      window.history.state.view !== 'dashboard'
    ) {
      window.history.back();
    } else {
      navigateToView('dashboard');
    }
  };

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search,
      );
    }

    if (!window.history.state?.view) {
      window.history.replaceState(
        { view: getSavedView() },
        '',
        window.location.pathname + window.location.search,
      );
    }

    const handlePopState = async (e: PopStateEvent) => {
      const targetView = (e.state?.view || 'dashboard') as ViewType;
      if (getActiveNavigationGuard()) {
        const canProceed = await confirmNavigation();
        if (!canProceed) {
          // Revert history state so browser URL and session remain on currentView
          window.history.pushState(
            { view: currentView },
            '',
            window.location.pathname + window.location.search,
          );
          return;
        }
      }
      setCurrentView(targetView);
      sessionStorage.setItem('vtop-retop-view', targetView);
    };

    const handleOpenSettings = () => {
      if ((window as any).__RETOP_OFFLINE__) {
        navigateToView('settings');
      } else if (
        typeof chrome !== 'undefined' &&
        chrome.runtime &&
        !!chrome.runtime.getURL
      ) {
        window.open('https://getretop.web.app/', '_blank');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('retop-open-settings', handleOpenSettings);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('retop-open-settings', handleOpenSettings);
    };
  }, [isModernUI]);

  useEffect(() => {
    applyTheme(settings);

    // Apply font scaling from settings
    if (settings.fontScale && settings.fontScale !== 100) {
      document.documentElement.style.fontSize = `${settings.fontScale}%`;
    }
    const authIdInput = document.getElementById(
      'authorizedIDX',
    ) as HTMLInputElement;
    let authId = authIdInput?.value;
    const htmlContent = document.documentElement.outerHTML;
    const domCsrfInput = document.querySelector(
      'input[name="_csrf"]',
    ) as HTMLInputElement;
    const csrfMatch =
      htmlContent.match(/csrfValue\s*=\s*"([^"]+)"/) ||
      htmlContent.match(/name=["']_csrf["'][^>]*value=["']([^"']+)["']/);
    let csrf =
      domCsrfInput?.value ||
      (csrfMatch ? csrfMatch[1] : (window as any).csrfValue) ||
      '';

    const isOffline = !!(window as any).__RETOP_OFFLINE__;
    if ((!authId || !csrf) && (isOffline || isStandalone)) {
      authId =
        authId ||
        (window as any).authorizedID ||
        localStorage.getItem('retop_active_user') ||
        localStorage.getItem('retop_lastAuthId') ||
        'student';
      csrf = csrf || (window as any).csrfValue || 'retop_csrf';
    }

    if (!authId || !csrf) {
      if (!isStandalone) {
        revealLegacyUI();
      }
      return;
    }

    csrfRef.current = csrf;
    authIdRef.current = authId;
    networkRef.current = new VTOPNetwork(csrf, authId);

    const isChennai =
      window.location.hostname.includes('vtopcc') ||
      localStorage.getItem('retop_campus') === 'chennai';
    const campus: 'chennai' | 'vellore' = isChennai ? 'chennai' : 'vellore';

    if (isOffline || isStandalone) {
      getUserProfileImage(authId)
        .then(async (decryptedImg) => {
          const res = await getStorageData([
            `${authId}_profileImage`,
            `${authId}_user_basic_profile`,
            'retop_cached_users',
          ]);
          const cachedProfile = res[`${authId}_user_basic_profile`];
          const cachedImg =
            decryptedImg ||
            res[`${authId}_profileImage`] ||
            (typeof localStorage !== 'undefined'
              ? localStorage.getItem(`${authId}_profileImage`) ||
                localStorage.getItem('retop_profileImage')
              : '') ||
            '';
          const cachedUsers = (res.retop_cached_users || []) as any[];
          const foundUser = cachedUsers.find(
            (u) => (u.regNo || '').toUpperCase() === authId.toUpperCase(),
          );

          const loadedUser = {
            regNo: authId,
            username: authId,
            name:
              cachedProfile?.name ||
              foundUser?.name ||
              localStorage.getItem('retop_lastName') ||
              'Student',
            profileImgBase64: cachedImg || foundUser?.profileImgBase64 || '',
            campus,
          };
          setUser(loadedUser);
        })
        .catch((err) => {
          console.warn('[retop] Could not load the cached user.', err);
        });
    } else {
      const scrapedUser = scrapeUserProfile(document);
      const userProfile = { ...scrapedUser, campus };
      const currentReg =
        userProfile.regNo && userProfile.regNo !== 'Student'
          ? userProfile.regNo
          : authId;

      getStorageData([
        'retop_cached_users',
        `${currentReg}_profileImage`,
        `${currentReg}_user_basic_profile`,
      ])
        .then((res: Record<string, any>) => {
          const rawUsers: any[] = res.retop_cached_users || [];
          const cleanReg = (r?: string) =>
            (r || '').replace(/\s*\(offline\)/gi, '').trim();
          const cleanUsersMap = new Map<string, any>();
          for (const u of rawUsers) {
            const cr = cleanReg(u.regNo);
            if (!cr) continue;
            const key = cr.toUpperCase();
            const existing = cleanUsersMap.get(key);
            cleanUsersMap.set(key, {
              ...u,
              regNo: cr,
              username: cleanReg(u.username) || cr,
              name: cleanReg(u.name) || existing?.name || 'Student',
              lastActive: Math.max(
                u.lastActive || 0,
                existing?.lastActive || 0,
              ),
            });
          }

          const existingUser = cleanUsersMap.get(currentReg.toUpperCase());
          const cachedUserImg =
            res[`${currentReg}_profileImage`] ||
            existingUser?.profileImgBase64 ||
            '';
          let profileImg = fixBase64Image(
            userProfile.profileImgBase64 || cachedUserImg,
          );

          const updatedUser = {
            regNo: currentReg,
            username: currentReg,
            name:
              cleanReg(userProfile.name) ||
              existingUser?.name ||
              res[`${currentReg}_user_basic_profile`]?.name ||
              'Student',
            profileImgBase64: profileImg || '',
            lastActive: Date.now(),
            campus,
          };
          cleanUsersMap.set(currentReg.toUpperCase(), updatedUser);
          const users = Array.from(cleanUsersMap.values());

          setUser(updatedUser);

          setStorageData({
            retop_lastAuthId: currentReg,
            retop_lastName: updatedUser.name,
            [`${currentReg}_profileImage`]: updatedUser.profileImgBase64,
            retop_active_user: currentReg,
            retop_last_campus: campus,
            retop_cached_users: users,
          });

          // Ensure raw image URLs are converted to self-contained Base64 and stored encrypted for offline mode
          if (profileImg && !profileImg.startsWith('data:image')) {
            urlToBase64(profileImg)
              .then((dataUri) => {
                if (dataUri && dataUri.startsWith('data:image')) {
                  saveUserProfileImage(currentReg, dataUri).catch(() => {});
                  updatedUser.profileImgBase64 = dataUri;
                  setUser({ ...updatedUser, profileImgBase64: dataUri });
                }
              })
              .catch(() => {});
          } else if (profileImg && profileImg.startsWith('data:image')) {
            saveUserProfileImage(currentReg, profileImg).catch(() => {});
          }

          // Relay scraped portal data to background worker for PWA sync
          if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
            try {
              chrome.runtime
                .sendMessage({
                  action: 'PORTAL_SCRAPED_DATA',
                  payload: {
                    user: updatedUser,
                    lastAuthId: currentReg,
                    campus,
                    cachedUsers: users,
                    timestamp: Date.now(),
                  },
                })
                .catch(() => {});
            } catch {}
          }
        })
        .catch((err) => {
          console.warn('[retop] Could not read the cached users.', err);
        });
    }

    // The store slice handles its own errors; this only guards against a
    // rejection escaping into the global error net.
    fetchDashboardData(networkRef.current, csrf, authId).catch((err) => {
      console.warn('[retop] Dashboard data load failed.', err);
    });

    let menuPoller: ReturnType<typeof setInterval> | undefined;
    let feedbackPoller: ReturnType<typeof setInterval> | undefined;

    if ((window as any).__RETOP_OFFLINE__ || isStandalone) {
      getCachedData<MenuCategory[]>(`${authId}_vtop_menu`).then(
        (cachedMenu) => {
          if (cachedMenu && cachedMenu.length > 0) {
            setMenu(cachedMenu);
          } else {
            getCachedData<MenuCategory[]>('vtop_menu').then((m) => {
              if (m && m.length > 0) setMenu(m);
            });
          }
        },
      );
      getCachedData<SpotlightCategoryGroup[]>(`${authId}_vtop_spotlight`).then(
        (cachedSpotlight) => {
          if (cachedSpotlight && cachedSpotlight.length > 0) {
            setSpotlightCategories(cachedSpotlight);
          } else {
            getCachedData<SpotlightCategoryGroup[]>('vtop_spotlight').then(
              (s) => {
                if (s && s.length > 0) setSpotlightCategories(s);
              },
            );
          }
        },
      );
    } else {
      let attempts = 0;
      menuPoller = setInterval(() => {
        attempts++;
        // A parser throw here would escape the interval and leave the app
        // half-initialised. Skip this tick instead.
        let newSpotlight: ReturnType<typeof scrapeSpotlight>;
        let newMenu: MenuCategory[];
        try {
          newSpotlight = scrapeSpotlight(document);
          newMenu = scrapeMenu(document);
        } catch (err) {
          console.warn('[retop] Menu scrape failed; retrying.', err);
          return;
        }
        if (newSpotlight.length > 0) {
          setSpotlightCategories(newSpotlight);
          setCachedData(`${authId}_vtop_spotlight`, newSpotlight);
          setCachedData('vtop_spotlight', newSpotlight);
        }

        const count = newMenu.reduce((acc, cat) => acc + cat.links.length, 0);
        if (count > 0) {
          setMenu(newMenu);
          setCachedData(`${authId}_vtop_menu`, newMenu);
          setCachedData('vtop_menu', newMenu);
        }

        setMenu((prev) => {
          const prevCount = prev.reduce(
            (acc, cat) => acc + cat.links.length,
            0,
          );
          if (count > prevCount) {
            setCachedData(`${authId}_vtop_menu`, newMenu);
            return newMenu;
          }
          return prev;
        });

        if (count === 0 && attempts > 5) {
          console.log(
            '[retop] Menu items are unfetchable. Falling back to legacy UI.',
          );
          clearInterval(menuPoller);
          revealLegacyUI();
          setIsModernUI(false);
          return;
        }

        if (count >= 102 || attempts > 15) clearInterval(menuPoller);
      }, 2000);

      let feedbackAttempts = 0;
      feedbackPoller = setInterval(() => {
        feedbackAttempts++;
        try {
          const formInputs = document.querySelectorAll(
            "input[type='radio'], textarea, select",
          );
          if (formInputs.length > 0) {
            const forms = document.querySelectorAll('form');
            for (let i = 0; i < forms.length; i++) {
              const text = (forms[i].textContent || '').toLowerCase();
              if (
                text.includes('feedback') ||
                text.includes('faculty feedback') ||
                text.includes('student feedback') ||
                text.includes('mandatory feedback')
              ) {
                console.log(
                  '[retop] Mandatory feedback form detected. Triggering legacy UI.',
                );
                clearInterval(feedbackPoller);
                revealLegacyUI();
                setIsModernUI(false);
                return;
              }
            }
          }
        } catch (e) {}

        if (feedbackAttempts >= 5) {
          clearInterval(feedbackPoller);
        }
      }, 3000);
    }

    const handleKeys = (e: KeyboardEvent) => {
      // If legacy UI is active (Retop is hidden), let legacy injector handle it
      if (document.body.classList.contains('show-legacy-ui')) {
        return;
      }

      // Ignore if user is typing in any input field or form control (shadow-DOM-aware)
      if (isTypingEvent(e)) {
        return;
      }

      if (e.key === 'Backspace') {
        if (isOmniboxOpenRef.current) return;
        const currentV = useAppStore.getState().currentView;
        if (currentV !== 'dashboard') {
          e.preventDefault();
          handleBack();
        }
        return;
      }

      if (isOmniboxOpenRef.current) {
        if (
          e.key !== 'Escape' &&
          e.key.length === 1 &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey
        ) {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent('vtop-omnibox-type', { detail: e.key }),
          );
        }
        return;
      }
      const shouldOpen =
        e.key === '/' ||
        e.code === 'Space' ||
        e.key === ' ' ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k');

      if (shouldOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        isOmniboxOpenRef.current = true;
        setOmniboxInitial('');
        setIsOmniboxOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeys, true);

    const restoreHandler = () => setIsModernUI(true);
    window.addEventListener('vtop-restore-ui', restoreHandler);

    const scrollHideTimeouts = new Map<HTMLElement, any>();
    const handleScroll = (e: Event) => {
      const target = (
        e.composedPath ? e.composedPath()[0] : e.target
      ) as HTMLElement;
      if (
        target &&
        target.classList &&
        (target.classList.contains('custom-scrollbar') ||
          (typeof target.className === 'string' &&
            target.className.includes('overflow-')))
      ) {
        if (!target.hasAttribute('data-scrolling')) {
          target.setAttribute('data-scrolling', 'true');
        }

        const existingHideTimeout = scrollHideTimeouts.get(target);
        if (existingHideTimeout) clearTimeout(existingHideTimeout);
        scrollHideTimeouts.set(
          target,
          setTimeout(() => {
            target.removeAttribute('data-scrolling');
            scrollHideTimeouts.delete(target);
          }, 3000),
        );
      }
    };
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      clearInterval(menuPoller);
      clearInterval(feedbackPoller);
      window.removeEventListener('keydown', handleKeys);
      window.removeEventListener('vtop-restore-ui', restoreHandler);
      document.removeEventListener('scroll', handleScroll, true);
      scrollHideTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      scrollHideTimeouts.clear();
    };
  }, []);

  useEffect(() => {
    setUIVisibility(isModernUI);
    sessionStorage.setItem('vtop-legacy-mode', (!isModernUI).toString());
  }, [isModernUI]);

  useEffect(() => {
    let pageName = 'Home';
    if (currentView === 'dashboard') pageName = 'Home';
    else if (currentView === 'timetable') pageName = 'Timetable';
    else if (currentView === 'attendance') pageName = 'Attendance';
    else if (currentView === 'marks') pageName = 'Marks';
    else if (currentView === 'grades') pageName = 'Grades';
    else if (currentView === 'examSchedule') pageName = 'Exam Schedule';
    else if (currentView === 'curriculum') pageName = 'Curriculum';
    else if (currentView === 'digitalAssignments') pageName = 'Assignments';
    else if (currentView === 'coursePage') pageName = 'Course Page';
    else if (currentView === 'calendar') pageName = 'Calendar';
    else if (currentView === 'profile') pageName = 'Profile';
    else if (currentView === 'content' && contentTitle) pageName = contentTitle;
    // @ts-ignore - Handle settings explicitly as fallback
    else if (currentView === 'settings') pageName = 'Settings';

    const isChennai =
      (typeof window !== 'undefined' &&
        window.location.hostname.includes('vtopcc')) ||
      (user as any)?.campus === 'chennai';
    const brand = isChennai ? 'retop Chennai' : 'retop';
    document.title = `${pageName} - ${brand}`;
  }, [currentView, contentTitle, user]);

  const handleLinkClick = async (
    link: QuickLink,
    forceLegacy: boolean = false,
  ) => {
    setIsOmniboxOpen(false);
    setShowProfileMenu(false);

    if (link.url === '#settings' || link.title.toLowerCase() === 'settings') {
      setIsModernUI(true);
      navigateToView('settings');
      return;
    }

    const dest = getDestinationView(link);

    const isOffline =
      typeof window !== 'undefined' &&
      (!!(window as any).__RETOP_OFFLINE__ ||
        window.location.pathname.includes('offline') ||
        window.location.hostname.includes('web.app') ||
        window.location.protocol === 'file:');

    if (isOffline) {
      if (dest !== 'content') {
        navigateToView(dest as ViewType);
      }
      return;
    }

    if (forceLegacy || dest === 'content') {
      if (isStandalone) {
        return;
      }
      const canProceed = await confirmNavigation();
      if (!canProceed) return;

      setContentTitle(link.title);
      setTimeout(() => {
        setIsModernUI(false);
        setTimeout(() => navigateLegacy(link.title, link.url), 50);
      }, 200);
      return;
    }

    if (!networkRef.current) return;
    setIsModernUI(true);
    navigateToView(dest as ViewType);
  };

  const handleLogout = async () => {
    if (isStandalone) {
      try {
        localStorage.removeItem('retop_lastAuthId');
        localStorage.removeItem('retop_active_user');
        sessionStorage.clear();
        await removeStorageKeys(['retop_lastAuthId', 'retop_active_user']);
      } catch {}
      window.location.reload();
      return;
    }

    try {
      await fetch('/vtop/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          _csrf: csrfRef.current,
          authorizedID: authIdRef.current,
        }),
      });
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      try {
        localStorage.removeItem('retop_lastAuthId');
        await removeStorageKeys(['retop_lastAuthId', 'retop_active_user']);
      } catch {}
      window.location.href = '/vtop/open/page';
    }
  };

  return (
    <>
      {isPeeking && (
        <style>{`
          body:not(.show-legacy-ui) #page-wrapper, 
          body:not(.show-legacy-ui) .container-fluid, 
          body:not(.show-legacy-ui) .wrapper, 
          body:not(.show-legacy-ui) body> table, 
          body:not(.show-legacy-ui) body> form {
            opacity: 1 !important;
            pointer-events: auto !important;
            transition: all 500ms cubic-bezier(0.32, 0.72, 0, 1) !important;
          }
        `}</style>
      )}

      {/* Main Modern UI - Always rendered to preserve state, just animated off-screen when hidden */}
      <div
        style={{
          transform: isModernUI
            ? 'translateY(0%)'
            : isPeeking
              ? 'translateY(calc(100vh - 80px))'
              : 'translateY(calc(100% + 100px))',
          transition: 'transform 500ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        className={`fixed inset-0 h-screen font-mono selection:bg-(--accent-base)/35 selection:text-(--text-main) flex flex-col overflow-hidden bg-(--bg-main) z-100 shadow-[0px_-20px_60px_rgba(0,0,0,0.6)] ${
          !isModernUI && !isPeeking
            ? 'pointer-events-none'
            : 'pointer-events-auto'
        }`}
      >
        <div className="flex flex-col h-full pointer-events-auto overflow-hidden">
          <TopBar
            currentView={currentView}
            contentTitle={contentTitle}
            showProfileMenu={showProfileMenu}
            setShowProfileMenu={setShowProfileMenu}
            handleLinkClick={handleLinkClick}
            handleLogout={handleLogout}
            isOmniboxOpen={isOmniboxOpen}
            setIsOmniboxOpen={setIsOmniboxOpen}
            setCurrentView={navigateToView}
            user={user}
            onBack={handleBack}
            pinnedLinks={pinnedLinks}
            menuCategories={menu}
            onTogglePin={handleTogglePin}
            onReorderPins={(newPins) => updateSetting('pinnedLinks', newPins)}
            onNavigate={handleLinkClick}
            initialQuery={omniboxInitial}
            onTimetableSemChange={(semId) => {
              if (networkRef.current && csrfRef.current && authIdRef.current) {
                loadTimetable(
                  networkRef.current,
                  csrfRef.current,
                  authIdRef.current,
                  semId,
                  true,
                ).catch(console.warn);
              }
            }}
            onSync={() => {
              handleSyncCurrentView().catch(console.warn);
            }}
            network={networkRef.current}
          />
          <main className="flex-1 overflow-hidden relative">
            <div
              key={currentView}
              className="absolute inset-0 w-full h-full flex flex-col overflow-hidden animate-page-crossfade"
            >
              <ContentRouter
                currentView={currentView}
                networkRef={networkRef}
                settings={settings}
                updateSetting={updateSetting}
                menu={menu}
                handleLinkClick={handleLinkClick}
                events={events}
                spotlightCategories={spotlightCategories}
                upcoming={upcoming}
                pinnedLinks={pinnedLinks}
                handleTogglePin={handleTogglePin}
                onSync={() => {
                  handleSyncCurrentView().catch(console.warn);
                }}
              />
            </div>
          </main>

          {currentView === 'timetable' && !isOmniboxOpen && (
            <FloatingViewToggle
              viewMode={ttViewMode}
              setViewMode={setTtViewMode}
            />
          )}

          {showProfileMenu && (
            <ProfileMenu
              userName={user.name}
              userRegNo={user.regNo}
              userProfileImg={user.profileImgBase64}
              onNavigate={handleLinkClick}
              onLogout={handleLogout}
              onLegacyToggle={() => {
                setIsPeeking(false);
                setIsModernUI(false);
              }}
              onClose={() => setShowProfileMenu(false)}
            />
          )}

          <SnackbarManager />
          <AlertDialogManager />
          <GlobalDADropZone network={networkRef.current!} />
        </div>
      </div>

      {!isModernUI && (
        <LegacyReturnButton
          onClick={() => {
            setIsPeeking(false);
            setIsModernUI(true);
          }}
          onMouseEnter={() => setIsPeeking(true)}
          onMouseLeave={() => setIsPeeking(false)}
        />
      )}
    </>
  );
};
