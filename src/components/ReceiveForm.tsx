"use client";

import { useEffect, useRef, useState } from "react";

import { Download, Spinner, BookOpen } from "./Icons";
import { isValidCode, normalizeCode } from "@/lib/code";
import { formatBytes } from "@/lib/file-types";

type State =
  | { phase: "idle" }
  | { phase: "fetching" }
  | {
      phase: "ready";
      filename: string;
      downloadUrl: string;
      size: number;
    }
  | { phase: "error"; message: string };

const KEY_LENGTH = 4;
const EXCLUDED_HINT =
  "Codes never include 0, 1, B, I, O, or Q (they look too much like other characters).";

function sanitizeCode(raw: string): string {
  return normalizeCode(raw).replace(/[^0-9A-Z]/g, "").slice(0, KEY_LENGTH);
}

type Props = {
  initialCode?: string;
  initialError?: string;
};

export function ReceiveForm({ initialCode = "", initialError }: Props) {
  const [code, setCode] = useState(() => sanitizeCode(initialCode));
  const [state, setState] = useState<State>(() =>
    initialError ? { phase: "error", message: initialError } : { phase: "idle" }
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const submittedAuto = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only auto-submit when the page was opened with a valid ?c= and there is
    // no inbound error; we never want to retry an error case automatically.
    if (
      !submittedAuto.current &&
      isValidCode(code) &&
      initialCode &&
      !initialError &&
      state.phase === "idle"
    ) {
      submittedAuto.current = true;
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, state.phase, initialCode, initialError]);

  function handleChange(raw: string) {
    setCode(sanitizeCode(raw));
    setState((prev) => (prev.phase === "error" ? { phase: "idle" } : prev));
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    // Read the freshest value from the DOM as well as React state. Some older
    // ereader browsers (Kobo's older WebKit) don't reliably fire the input
    // event React relies on, so the controlled state can lag behind what is
    // actually typed in the box.
    const liveValue = sanitizeCode(inputRef.current?.value ?? "");
    const finalCode = liveValue || code;

    if (finalCode.length === 0) {
      setState({
        phase: "error",
        message:
          "Type the four characters shown on the device that uploaded the book.",
      });
      return;
    }
    if (finalCode.length < KEY_LENGTH) {
      setState({
        phase: "error",
        message: `Codes are ${KEY_LENGTH} characters. You typed ${finalCode.length}.`,
      });
      return;
    }
    if (!isValidCode(finalCode)) {
      setState({
        phase: "error",
        message: `That code has a character we don't use. ${EXCLUDED_HINT} Double-check the device that uploaded the book.`,
      });
      return;
    }

    // Make sure the input/state reflect what we're actually submitting.
    if (finalCode !== code) setCode(finalCode);

    setState({ phase: "fetching" });
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: finalCode }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        filename?: string;
        downloadUrl?: string;
        size?: number;
      };
      if (!res.ok || !data.downloadUrl || !data.filename) {
        throw new Error(data.error ?? "Could not retrieve the file.");
      }
      setState({
        phase: "ready",
        filename: data.filename,
        downloadUrl: data.downloadUrl,
        size: data.size ?? 0,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not retrieve the file.";
      setState({ phase: "error", message });
    }
  }

  function reset() {
    setCode("");
    setState({ phase: "idle" });
    submittedAuto.current = false;
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.focus();
  }

  if (state.phase === "ready") {
    return (
      <div className="reveal-up paper-card rounded-2xl p-6 sm:p-8 text-center">
        <div className="mx-auto mb-5 size-14 rounded-full bg-leaf-soft text-leaf flex items-center justify-center">
          <BookOpen className="size-7" />
        </div>
        <h2 className="font-display text-2xl sm:text-3xl text-ink">
          Your book is ready
        </h2>
        <p className="mt-2 text-ink-muted break-all">{state.filename}</p>
        {state.size > 0 && (
          <p className="text-xs text-ink-faint font-mono mt-1">
            {formatBytes(state.size)}
          </p>
        )}
        <a
          href={state.downloadUrl}
          download={state.filename}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-ink text-paper px-6 py-3 text-base font-medium hover:bg-accent-deep transition-colors"
        >
          <Download className="size-5" />
          Download to ereader
        </a>
        <p className="mt-4 text-xs text-ink-muted">
          If your ereader doesn&apos;t open the file automatically, find it in
          the Downloads folder of its file browser.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 text-sm text-ink-muted hover:text-ink underline-offset-2 hover:underline"
        >
          Receive another book
        </button>
      </div>
    );
  }

  return (
    <form
      action="/r/get"
      method="POST"
      onSubmit={submit}
      className="space-y-5"
    >
      <div>
        <label
          htmlFor="receive-code"
          className="block text-xs uppercase tracking-[0.18em] text-ink-muted mb-3 text-center"
        >
          Enter the four-character code
        </label>
        {/*
          One uncontrolled-friendly input. We wire `value` so it stays in sync
          when React hydrates, but we always read the DOM value at submit time
          so we still work on browsers that don't fire React's synthetic input
          events (older Kobo WebKit). `name="code"` means a plain HTML POST to
          /r/get carries whatever the user actually typed, regardless of
          whether JS hydrated.
        */}
        <input
          id="receive-code"
          ref={inputRef}
          type="text"
          name="code"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={KEY_LENGTH}
          defaultValue={code}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          style={{ textTransform: "uppercase", letterSpacing: "0.35em" }}
          className="code-tile block w-full max-w-[18rem] mx-auto h-20 sm:h-24 text-center font-display text-5xl sm:text-6xl text-ink rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-shadow"
          aria-label="Four-character code"
        />
      </div>

      {state.phase === "error" && (
        <div className="rounded-lg border border-crimson/30 bg-crimson-soft px-4 py-3 text-sm text-crimson text-center">
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={state.phase === "fetching"}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-ink text-paper px-6 py-3 text-base font-medium hover:bg-accent-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state.phase === "fetching" ? (
          <>
            <Spinner className="size-5" />
            Fetching…
          </>
        ) : (
          <>Get my book</>
        )}
      </button>

      <p className="text-center text-xs text-ink-muted">
        {EXCLUDED_HINT} Codes expire after an hour.
      </p>
    </form>
  );
}
