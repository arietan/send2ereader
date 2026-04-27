import { NextResponse } from "next/server";

import { deleteMetaAndFile, listAllMeta } from "@/lib/meta";

export const runtime = "nodejs";
export const maxDuration = 60;

const TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;

  // Vercel Cron always sends the Authorization header when CRON_SECRET is set.
  // For local dev, fall back to allowing requests without a secret if none is configured.
  if (expected && auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const all = await listAllMeta();
  const now = Date.now();
  const stale = all.filter((meta) => {
    const t = Date.parse(meta.createdAt);
    return Number.isFinite(t) && now - t > TTL_MS;
  });

  let deleted = 0;
  for (const meta of stale) {
    try {
      await deleteMetaAndFile(meta);
      deleted++;
    } catch {
      // continue with the rest
    }
  }

  return NextResponse.json({
    ok: true,
    total: all.length,
    expired: stale.length,
    deleted,
    ttlMs: TTL_MS,
  });
}
