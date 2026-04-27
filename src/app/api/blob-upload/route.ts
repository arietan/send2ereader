import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import {
  ALLOWED_CONTENT_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  getExtension,
} from "@/lib/file-types";

const PATH_REGEX = /^uploads\/[0-9a-f-]{36}\/[^/]+$/i;

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!PATH_REGEX.test(pathname)) {
          throw new Error(
            "Invalid pathname. Uploads must use uploads/<uuid>/<filename>."
          );
        }
        const filename = pathname.split("/").pop() ?? "";
        const ext = getExtension(filename);
        if (!ALLOWED_EXTENSIONS.has(ext)) {
          throw new Error(
            `File type .${ext || "?"} is not supported. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}.`
          );
        }
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 60,
        };
      },
      onUploadCompleted: async () => {
        // Finalisation happens in POST /api/finalize, where the client posts the resulting
        // blob URL back so we can mint a 4-character code and write metadata.
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload setup failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
