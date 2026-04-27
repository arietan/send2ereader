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

type Props = {
  initialCode?: string;
};

export function ReceiveForm({ initialCode = "" }: Props) {
  const [chars, setChars] = useState<string[]>(() => {
    const initial = normalizeCode(initialCode).slice(0, KEY_LENGTH);
    const arr = Array(KEY_LENGTH).fill("");
    for (let i = 0; i < initial.length; i++) arr[i] = initial[i];
    return arr;
  });
  const [state, setState] = useState<State>({ phase: "idle" });
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const submittedAuto = useRef(false);

  const code = chars.join("");

  useEffect(() => {
    // Focus the first empty input on mount.
    const firstEmpty = chars.findIndex((ch) => !ch);
    const idx = firstEmpty === -1 ? KEY_LENGTH - 1 : firstEmpty;
    inputRefs.current[idx]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      !submittedAuto.current &&
      isValidCode(code) &&
      initialCode &&
      state.phase === "idle"
    ) {
      submittedAuto.current = true;
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, state.phase, initialCode]);

  function setCharAt(idx: number, value: string) {
    const next = [...chars];
    next[idx] = value;
    setChars(next);
  }

  function handleChange(idx: number, raw: string) {
    const cleaned = raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
    if (cleaned.length === 0) {
      setCharAt(idx, "");
      return;
    }
    if (cleaned.length === 1) {
      setCharAt(idx, cleaned);
      if (idx < KEY_LENGTH - 1) {
        inputRefs.current[idx + 1]?.focus();
      }
      return;
    }
    // pasted multiple chars
    const next = [...chars];
    let cursor = idx;
    for (const ch of cleaned) {
      if (cursor >= KEY_LENGTH) break;
      next[cursor] = ch;
      cursor++;
    }
    setChars(next);
    const focusIdx = Math.min(cursor, KEY_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !chars[idx] && idx > 0) {
      e.preventDefault();
      setCharAt(idx - 1, "");
      inputRefs.current[idx - 1]?.focus();
      return;
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      inputRefs.current[idx - 1]?.focus();
      return;
    }
    if (e.key === "ArrowRight" && idx < KEY_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[idx + 1]?.focus();
      return;
    }
    if (e.key === "Enter" && isValidCode(chars.join(""))) {
      e.preventDefault();
      void submit();
    }
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const finalCode = normalizeCode(chars.join(""));
    if (!isValidCode(finalCode)) {
      setState({ phase: "error", message: "Type the four characters from your phone or laptop." });
      return;
    }
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
    setChars(Array(KEY_LENGTH).fill(""));
    setState({ phase: "idle" });
    submittedAuto.current = false;
    inputRefs.current[0]?.focus();
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
    <form onSubmit={submit} className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted mb-3 text-center">
          Enter the four-character code
        </p>
        <div className="flex justify-center gap-2 sm:gap-3">
          {chars.map((ch, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={KEY_LENGTH}
              value={ch}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onFocus={(e) => e.currentTarget.select()}
              className="code-tile w-16 h-20 sm:w-20 sm:h-24 text-center font-display text-4xl sm:text-5xl text-ink rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-shadow"
              aria-label={`Code character ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {state.phase === "error" && (
        <div className="rounded-lg border border-crimson/30 bg-crimson-soft px-4 py-3 text-sm text-crimson text-center">
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={!isValidCode(code) || state.phase === "fetching"}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-ink text-paper px-6 py-3 text-base font-medium hover:bg-accent-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state.phase === "fetching" ? (
          <>
            <Spinner className="size-5" />
            Fetching…
          </>
        ) : (
          <>
            Get my book
          </>
        )}
      </button>

      <p className="text-center text-xs text-ink-muted">
        Codes use digits and uppercase letters only. They expire after an hour.
      </p>
    </form>
  );
}
