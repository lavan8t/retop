import { getStorageData, setStorageData } from "./storageAdapter";

export interface PinRecord {
  salt: string;
  hash: string;
}

/**
 * Converts ArrayBuffer or TypedArray to Hex string
 */
function bufferToHex(buffer: ArrayBuffer | ArrayBufferView): string {
  const bytes = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Converts Hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Computes a salted SHA-256 hash of a 4-digit PIN + regNo
 */
export async function hashPin(pin: string, regNo: string, existingSalt?: string): Promise<PinRecord> {
  const salt = existingSalt || bufferToHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const encoder = new TextEncoder();
  const data = encoder.encode(`retop_${regNo.toLowerCase()}_${pin}_${salt}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hash = bufferToHex(hashBuffer);

  return { salt, hash };
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
