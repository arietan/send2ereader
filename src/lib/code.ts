import { head } from "@vercel/blob";

import { metaPathname } from "./meta";

const KEY_CHARS = "23456789ACDEFGHJKLMNPRSTUVWXYZ";
const KEY_LENGTH = 4;
const MAX_GENERATE_ATTEMPTS = 12;

export function isValidCode(input: string): boolean {
  if (typeof input !== "string") return false;
  if (input.length !== KEY_LENGTH) return false;
  for (const ch of input) {
    if (!KEY_CHARS.includes(ch)) return false;
  }
  return true;
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase();
}

function randomCode(): string {
  let code = "";
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(KEY_LENGTH);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < KEY_LENGTH; i++) {
      code += KEY_CHARS[bytes[i] % KEY_CHARS.length];
    }
    return code;
  }
  for (let i = 0; i < KEY_LENGTH; i++) {
    code += KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)];
  }
  return code;
}

export async function isCodeAvailable(code: string): Promise<boolean> {
  try {
    await head(metaPathname(code));
    return false;
  } catch {
    return true;
  }
}

export async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
    const candidate = randomCode();
    if (await isCodeAvailable(candidate)) {
      return candidate;
    }
  }
  throw new Error("Could not generate a unique code after several attempts.");
}
