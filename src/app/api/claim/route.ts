import { getDownloadUrl } from "@vercel/blob";
import { NextResponse } from "next/server";

import { isValidCode, normalizeCode } from "@/lib/code";
import { readMeta, writeMeta } from "@/lib/meta";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = normalizeCode(body.code ?? "");
  if (!isValidCode(code)) {
    return NextResponse.json(
      { error: "Codes are 4 characters long, made up of digits and uppercase letters." },
      { status: 400 }
    );
  }

  const meta = await readMeta(code);
  if (!meta) {
    return NextResponse.json(
      { error: "We couldn't find a file with that code. It may have expired or been claimed already." },
      { status: 404 }
    );
  }

  if (!meta.claimedAt) {
    try {
      await writeMeta({ ...meta, claimedAt: new Date().toISOString() });
    } catch {
      // best-effort; the download still works even if we can't update claim status
    }
  }

  return NextResponse.json({
    code: meta.code,
    filename: meta.filename,
    downloadUrl: getDownloadUrl(meta.blobUrl),
    contentType: meta.contentType,
    size: meta.size,
    createdAt: meta.createdAt,
  });
}
