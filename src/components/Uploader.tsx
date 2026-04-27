"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useRef, useState } from "react";

import { CloudUp, Spinner } from "./Icons";
import { CodeDisplay } from "./CodeDisplay";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  formatBytes,
  getExtension,
  sanitizeFilename,
} from "@/lib/file-types";

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; filename: string; loaded: number; total: number }
  | { phase: "finalizing"; filename: string }
  | {
      phase: "ready";
      code: string;
      filename: string;
      size: number;
    }
  | { phase: "error"; message: string };

const acceptList = [...ALLOWED_EXTENSIONS].map((ext) => `.${ext}`).join(",");

type UploaderProps = {
  /** Server-derived origin (e.g. "https://send.example.com") used for the receive QR/URL. */
  origin: string;
};

export function Uploader({ origin }: UploaderProps) {
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(async (file: File) => {
    const filename = sanitizeFilename(file.name);
    const ext = getExtension(filename);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      setState({
        phase: "error",
        message: `Sorry, .${ext || "?"} files aren't supported. Try EPUB, MOBI, AZW3, PDF, CBZ, CBR, TXT, or HTML.`,
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setState({
        phase: "error",
        message: `That file is ${formatBytes(file.size)}. The upload limit is ${formatBytes(MAX_FILE_SIZE)}.`,
      });
      return;
    }
    if (file.size === 0) {
      setState({ phase: "error", message: "That file is empty." });
      return;
    }

    const sessionId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-xxxx-xxxx-xxxxxxxxxxxx`;

    const pathname = `uploads/${sessionId}/${filename}`;

    setState({ phase: "uploading", filename, loaded: 0, total: file.size });

    let blobResult;
    try {
      blobResult = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
        multipart: true,
        contentType: file.type || undefined,
        onUploadProgress: ({ loaded, total }) => {
          setState({ phase: "uploading", filename, loaded, total });
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed.";
      setState({ phase: "error", message });
      return;
    }

    setState({ phase: "finalizing", filename });

    try {
      const res = await fetch("/api/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: blobResult.url,
          pathname: blobResult.pathname,
          filename,
          contentType: blobResult.contentType,
          size: file.size,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Failed to finalize (${res.status})`);
      }
      const data = (await res.json()) as { code: string };
      setState({
        phase: "ready",
        code: data.code,
        filename,
        size: file.size,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not finalize upload.";
      setState({ phase: "error", message });
    }
  }, []);

  function reset() {
    setState({ phase: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function release() {
    if (state.phase !== "ready") return;
    try {
      await fetch("/api/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: state.code }),
      });
    } catch {
      // ignore
    }
    reset();
  }

  if (state.phase === "ready") {
    return (
      <CodeDisplay
        code={state.code}
        filename={state.filename}
        size={state.size}
        origin={origin}
        onRelease={release}
      />
    );
  }

  if (state.phase === "uploading" || state.phase === "finalizing") {
    const progress =
      state.phase === "uploading" && state.total > 0
        ? Math.min(99, Math.round((state.loaded / state.total) * 100))
        : 100;
    return (
      <div className="reveal-up paper-card rounded-2xl p-6 sm:p-8 text-center">
        <div className="mx-auto mb-5 size-12 rounded-full bg-accent-soft text-accent-deep flex items-center justify-center">
          <Spinner className="size-6" />
        </div>
        <h3 className="font-display text-2xl text-ink">
          {state.phase === "uploading" ? "Sending your book…" : "Almost there…"}
        </h3>
        <p className="text-ink-muted mt-1 break-all">{state.filename}</p>
        <div className="mt-6 progress-track h-2 w-full rounded-full overflow-hidden">
          <div
            className="progress-fill h-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-ink-muted mt-2 font-mono">
          {state.phase === "uploading"
            ? `${formatBytes(state.loaded)} / ${formatBytes(state.total)} · ${progress}%`
            : "Generating your code…"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label
        htmlFor="ereader-file"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={`paper-card relative block rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center cursor-pointer transition-all ${
          dragOver
            ? "border-accent bg-accent-soft scale-[1.01]"
            : "border-hairline-strong hover:border-accent hover:bg-accent-soft/50"
        }`}
      >
        <input
          ref={fileInputRef}
          id="ereader-file"
          type="file"
          accept={acceptList}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <div className="mx-auto mb-4 size-14 rounded-full bg-accent-soft text-accent-deep flex items-center justify-center">
          <CloudUp className="size-7" />
        </div>
        <p className="font-display text-2xl text-ink">
          Drop a book, or click to choose
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          EPUB · MOBI · AZW3 · PDF · CBZ · CBR · TXT · HTML
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          Up to {formatBytes(MAX_FILE_SIZE)}. Files are auto-deleted after one hour.
        </p>
      </label>

      {state.phase === "error" && (
        <div className="rounded-lg border border-crimson/30 bg-crimson-soft px-4 py-3 text-sm text-crimson">
          {state.message}
          <button
            type="button"
            onClick={reset}
            className="ml-2 underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
