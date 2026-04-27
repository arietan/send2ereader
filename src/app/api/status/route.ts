import { NextResponse } from "next/server";

import { isValidCode, normalizeCode } from "@/lib/code";
import { readMeta } from "@/lib/meta";

export const runtime = "nodejs";
// Polling endpoint: must always re-check the meta blob, never serve a cached
// response from Vercel's edge.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
} as const;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = normalizeCode(url.searchParams.get("code") ?? "");
  if (!isValidCode(code)) {
    return NextResponse.json(
      { error: "Invalid code" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const meta = await readMeta(code);
  if (!meta) {
    return NextResponse.json(
      { exists: false },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    {
      exists: true,
      claimed: Boolean(meta.claimedAt),
      claimedAt: meta.claimedAt,
      filename: meta.filename,
      size: meta.size,
      createdAt: meta.createdAt,
    },
    { headers: NO_STORE_HEADERS }
  );
}
