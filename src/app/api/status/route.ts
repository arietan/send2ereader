import { NextResponse } from "next/server";

import { isValidCode, normalizeCode } from "@/lib/code";
import { readMeta } from "@/lib/meta";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = normalizeCode(url.searchParams.get("code") ?? "");
  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const meta = await readMeta(code);
  if (!meta) {
    return NextResponse.json({ exists: false }, { status: 404 });
  }

  return NextResponse.json({
    exists: true,
    claimed: Boolean(meta.claimedAt),
    claimedAt: meta.claimedAt,
    filename: meta.filename,
    size: meta.size,
    createdAt: meta.createdAt,
  });
}
