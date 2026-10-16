import { getStorageData, setStorageData, removeStorageKeys } from "./storageAdapter";

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

/**
 * Encrypts sensitive string data with AES-GCM using a user-bound derivation key
 */
export async function encryptUserData(text: string, regNo: string): Promise<string> {
  if (!text) return "";
  try {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.digest("SHA-256", encoder.encode(`retop_enc_key_${regNo.toLowerCase()}`));
    const cryptoKey = await crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, ["encrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, encoder.encode(text));
    return `enc_${toHex(iv)}_${toHex(encrypted)}`;
  } catch (e) {
    console.warn("Failed to encrypt user data", e);
    return text;
  }
}

/**
 * Decrypts AES-GCM encrypted user string data
 */
export async function decryptUserData(cipherText: string, regNo: string): Promise<string> {
  if (!cipherText) return "";
  if (!cipherText.startsWith("enc_")) return cipherText; // Plaintext fallback
  try {
    const parts = cipherText.slice(4).split("_");
    if (parts.length !== 2) return cipherText;
    const [ivHex, dataHex] = parts;
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
    const data = new Uint8Array(dataHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.digest("SHA-256", encoder.encode(`retop_enc_key_${regNo.toLowerCase()}`));
    const cryptoKey = await crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, ["decrypt"]);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, data);
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.warn("Failed to decrypt user data", e);
    return "";
  }
}

/**
 * Persists an encrypted profile image into IndexedDB mapped by registration number
 */
export async function saveUserProfileImage(regNo: string, base64Data: string): Promise<void> {
  if (!regNo || !base64Data) return;
  const cleanReg = regNo.trim();
  const lowerReg = cleanReg.toLowerCase();
  const upperReg = cleanReg.toUpperCase();
  const encrypted = await encryptUserData(base64Data, lowerReg);

  await setStorageData({
    [`retop_img_${lowerReg}`]: encrypted,
  });

  // Remove any legacy plaintext photo copies so only the encrypted value remains.
  await removeStorageKeys([
    `${upperReg}_profileImage`,
    `${lowerReg}_profileImage`,
    "retop_profileImage",
  ]);
}

/**
 * Retrieves and decrypts the profile image from IndexedDB/localStorage mapped by registration number
 */
export async function getUserProfileImage(regNo: string): Promise<string> {
  if (!regNo) return "";
  const cleanReg = regNo.trim();
  const lowerReg = cleanReg.toLowerCase();
  const upperReg = cleanReg.toUpperCase();

  const keys = [
    `retop_img_${lowerReg}`,
    `${upperReg}_profileImage`,
    `${lowerReg}_profileImage`,
    "retop_profileImage",
  ];
  const res = await getStorageData(keys);

  // 1. Try decrypting stored encrypted image
  const encrypted = res[`retop_img_${lowerReg}`];
  if (encrypted && typeof encrypted === "string") {
    const decrypted = await decryptUserData(encrypted, lowerReg);
    if (decrypted && decrypted.startsWith("data:image")) return decrypted;
  }

  // 2. Migrate and clean up any legacy plaintext photo copies
  for (const k of keys) {
    const val = res[k];
    if (val && typeof val === "string" && val.startsWith("data:image") && val.length > 50) {
      await saveUserProfileImage(regNo, val);
      return val;
    }
  }

  // 3. Fallback to direct localStorage scan, then migrate the legacy copy
  if (typeof localStorage !== "undefined") {
    for (const k of keys) {
      try {
        const val = localStorage.getItem(k);
        if (val && val.startsWith("data:image") && val.length > 50) {
          await saveUserProfileImage(regNo, val);
          return val;
        }
      } catch {}
    }
  }

  return "";
}
