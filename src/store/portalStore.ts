import { create } from "zustand";
import { persist, StateStorage, createJSONStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";

export const indexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const data = await get(name);
      return data !== undefined && data !== null
        ? typeof data === "string"
          ? data
          : JSON.stringify(data)
        : null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await set(name, value);
    } catch (e) {
      console.warn("[IndexedDB Storage] Failed to persist state", e);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await del(name);
    } catch (e) {
      console.warn("[IndexedDB Storage] Failed to delete state", e);
    }
  },
};

export interface PortalState {
  data: any;
  lastSynced: number | null;
  setData: (data: any) => void;
  clearData: () => void;
}

export const usePortalStore = create<PortalState>()(
  persist(
    (set) => ({
      data: null,
      lastSynced: null,
      setData: (data) => set({ data, lastSynced: Date.now() }),
      clearData: () => set({ data: null, lastSynced: null }),
    }),
    {
      name: "portal-app-storage", // Matches key written by bridge content script
      storage: createJSONStorage(() => indexedDBStorage),
    }
  )
);

// Auto-sync store when bridge script emits sync event in browser
if (typeof window !== "undefined") {
  window.addEventListener("retop-pwa-synced", (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail) {
      usePortalStore.getState().setData(customEvent.detail);
    }
  });
}
