import { getDownloadUrl } from "@vercel/blob";
import { NextResponse } from "next/server";

import { isValidCode, normalizeCode } from "@/lib/code";
import { readMeta, writeMeta } from "@/lib/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY_LENGTH = 4;

function backToForm(origin: string, code: string, error: string): Response {
  const url = new URL("/r", origin);
  if (code) url.searchParams.set("c", code);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;

  let raw = "";
  try {
    const form = await request.formData();
    const value = form.get("code");
    raw = typeof value === "string" ? value : "";
  } catch {
    return backToForm(origin, "", "Couldn't read the form. Please try again.");
  }

  const code = normalizeCode(raw);

  if (code.length === 0) {
    return backToForm(
      origin,
      "",
      "Type the four characters shown on the device that uploaded the book."
    );
  }
  if (code.length < KEY_LENGTH) {
    return backToForm(
      origin,
      code,
      `Codes are ${KEY_LENGTH} characters. You typed ${code.length}.`
    );
  }
  if (!isValidCode(code)) {
    return backToForm(
      origin,
      code,
      "That code has a character we don't use. Codes never include 0, 1, B, I, O, or Q. Double-check the device that uploaded the book."
    );
  }

  const meta = await readMeta(code);
  if (!meta) {
    return backToForm(
      origin,
      code,
      "We couldn't find a file with that code. It may have expired or already been claimed."
    );
  }

  if (!meta.claimedAt) {
    try {
      await writeMeta({ ...meta, claimedAt: new Date().toISOString() });
    } catch {
      // Best-effort: the download still works even if the claim flag fails.
    }
  }

  return NextResponse.redirect(getDownloadUrl(meta.blobUrl), 303);
}
