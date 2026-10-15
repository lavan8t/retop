/**
 * User role storage.
 *
 * The role decides — synchronously, inside the first task at document_start —
 * whether retop takes over the login route or hands the document back to VTOP.
 * IndexedDB cannot answer that question in time, so localStorage holds the
 * authoritative mirror while IndexedDB keeps the copy every other context reads.
 */
import { get as idbGet, set as idbSet } from "idb-keyval";

export type RetopRole = "student" | "employee" | "parent" | "alumni";

const ROLE_KEY = "retop-user-role";

/** Roles retop renders its own sign-in UI for. */
export const isOwnableRole = (role: string): boolean =>
  role === "student" || role === "employee";

/** Zero-tick read. Safe to call from the document_start bootstrapper. */
export function readRoleSync(): RetopRole {
  try {
    return (localStorage.getItem(ROLE_KEY) as RetopRole) || "student";
  } catch {
    return "student";
  }
}

/**
 * Authoritative read. Migrates a stale mirror on first run after an update so
 * users who were parked on a parent/alumni form keep that role.
 */
export async function readRole(): Promise<RetopRole> {
  try {
    const stored = (await idbGet(ROLE_KEY)) as RetopRole | undefined;
    if (stored) {
      if (readRoleSync() !== stored) writeMirror(stored);
      return stored;
    }
  } catch {}
  return readRoleSync();
}

export async function setRole(role: RetopRole): Promise<void> {
  writeMirror(role);
  try {
    await idbSet(ROLE_KEY, role);
  } catch {}
}

function writeMirror(role: RetopRole) {
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch {}
}