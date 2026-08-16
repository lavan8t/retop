import { getStorageData, setStorageData } from "./storageAdapter";

export interface PinRecord {
  salt: string;
  hash: string;
}

const toHex = (buf: ArrayBuffer | ArrayBufferView): string => {
  const bytes = ArrayBuffer.isView(buf)
    ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
    : new Uint8Array(buf);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * Computes a salted SHA-256 hash of a 4-digit PIN + regNo
 */
export async function hashPin(pin: string, regNo: string, existingSalt?: string): Promise<PinRecord> {
  const salt = existingSalt || toHex(crypto.getRandomValues(new Uint8Array(16)));
  const data = new TextEncoder().encode(`retop_${regNo.toLowerCase()}_${pin}_${salt}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return { salt, hash: toHex(hashBuffer) };
}

/**
 * Saves an encrypted/hashed PIN for a given regNo
 */
export async function saveUserPin(regNo: string, pin: string): Promise<PinRecord> {
  const record = await hashPin(pin, regNo);
  await setStorageData({
    [`retop_pin_${regNo.toLowerCase()}`]: record,
  });
  return record;
}

/**
 * Retrieves the PIN record for a given regNo
 */
export async function getUserPinRecord(regNo: string): Promise<PinRecord | null> {
  const key = `retop_pin_${regNo.toLowerCase()}`;
  const res = await getStorageData([key]);
  const raw = res[key];

  if (!raw) return null;

  if (typeof raw === "object" && raw.salt && raw.hash) {
    return raw as PinRecord;
  }

  // Support legacy plain-text pin migration if present
  if (typeof raw === "string" && raw.length === 4) {
    return await saveUserPin(regNo, raw);
  }

  return null;
}

/**
 * Verifies if an entered PIN matches the stored encrypted PIN record for a regNo
 */
export async function verifyUserPin(regNo: string, enteredPin: string): Promise<boolean> {
  const record = await getUserPinRecord(regNo);
  if (!record) return false;

  const computed = await hashPin(enteredPin, regNo, record.salt);
  return computed.hash === record.hash;
}
