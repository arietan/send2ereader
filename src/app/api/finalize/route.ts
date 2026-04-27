import { NextResponse } from "next/server";

import { generateUniqueCode } from "@/lib/code";
import {
  ALLOWED_EXTENSIONS,
  getExtension,
  isAllowedFilename,
  sanitizeFilename,
} from "@/lib/file-types";
import { writeMeta, type Meta } from "@/lib/meta";

export const runtime = "nodejs";

type Body = {
  url?: string;
  pathname?: string;
  filename?: string;
  contentType?: string;
  size?: number;
  agentHint?: string;
};

const VALID_HOSTS = /\.public\.blob\.vercel-storage\.com$/i;

export async function POST(request: Request): Promise<Response> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    url,
    pathname = "",
    filename: rawFilename = "",
    contentType = "application/octet-stream",
    size = 0,
    agentHint = null,
  } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (!VALID_HOSTS.test(parsed.hostname)) {
    return NextResponse.json(
      { error: "URL is not a Vercel Blob host" },
      { status: 400 }
    );
  }
  if (!parsed.pathname.startsWith("/uploads/")) {
    return NextResponse.json(
      { error: "Blob is not in the uploads namespace" },
      { status: 400 }
    );
  }

  const filename = sanitizeFilename(rawFilename);
  if (!filename || !isAllowedFilename(filename)) {
    return NextResponse.json(
      {
        error: `Invalid filename. Allowed extensions: ${[...ALLOWED_EXTENSIONS].join(", ")}`,
      },
      { status: 400 }
    );
  }

  let code: string;
  try {
    code = await generateUniqueCode();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mint code" },
      { status: 503 }
    );
  }

  const meta: Meta = {
    code,
    filename,
    contentType: contentType || "application/octet-stream",
    size: Number.isFinite(size) ? Number(size) : 0,
    blobUrl: url,
    blobPathname: pathname,
    createdAt: new Date().toISOString(),
    claimedAt: null,
    agentHint: agentHint || null,
  };

  try {
    await writeMeta(meta);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to write metadata" },
      { status: 500 }
    );
  }

  return NextResponse.json({ code, ext: getExtension(filename) });
}
