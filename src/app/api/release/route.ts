import { NextResponse } from "next/server";

import { isValidCode, normalizeCode } from "@/lib/code";
import { deleteMetaAndFile, readMeta } from "@/lib/meta";

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
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const meta = await readMeta(code);
  if (!meta) {
    return NextResponse.json({ ok: true, alreadyGone: true });
  }

  await deleteMetaAndFile(meta);
  return NextResponse.json({ ok: true });
}
