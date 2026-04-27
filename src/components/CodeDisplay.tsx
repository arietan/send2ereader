"use client";

import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

import { Check, Copy, Trash, Spinner } from "./Icons";
import { formatBytes } from "@/lib/file-types";

type Status =
  | { phase: "waiting" }
  | { phase: "claimed"; claimedAt: string };

type Props = {
  code: string;
  filename: string;
  size: number;
  origin: string;
  onRelease: () => Promise<void> | void;
};

const POLL_MS = 3500;

export function CodeDisplay({ code, filename, size, origin, onRelease }: Props) {
  const [status, setStatus] = useState<Status>({ phase: "waiting" });
  const [copied, setCopied] = useState<"code" | "url" | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);

  const receiveUrl = useMemo(() => `${origin}/r?c=${code}`, [origin, code]);
  const receivePlain = useMemo(() => `${origin}/r`, [origin]);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(receiveUrl, {
      margin: 1,
      width: 320,
      color: { dark: "#1f1812", light: "#fbf6ec" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [receiveUrl]);

  useEffect(() => {
    if (status.phase === "claimed") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const res = await fetch(`/api/status?code=${encodeURIComponent(code)}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { claimed: boolean; claimedAt: string | null };
          if (data.claimed && data.claimedAt) {
            setStatus({ phase: "claimed", claimedAt: data.claimedAt });
            return;
          }
        }
      } catch {
        // ignore polling errors
      }
      if (!cancelled) timer = setTimeout(tick, POLL_MS);
    }

    timer = setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [code, status.phase]);

  async function copyText(text: string, kind: "code" | "url") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1600);
    } catch {
      // clipboard might be unavailable; ignore silently
    }
  }

  async function handleRelease() {
    setReleasing(true);
    try {
      await onRelease();
    } finally {
      setReleasing(false);
    }
  }

  return (
    <div className="reveal-up grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink-muted mb-3">
            Type this on your ereader
          </p>
          <div className="flex items-stretch gap-2">
            {code.split("").map((ch, i) => (
              <div
                key={i}
                className="code-tile rounded-lg flex-1 aspect-square flex items-center justify-center"
              >
                <span className="font-display text-5xl sm:text-6xl md:text-7xl text-ink leading-none">
                  {ch}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
            <button
              type="button"
              onClick={() => copyText(code, "code")}
              className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
            >
              {copied === "code" ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied === "code" ? "Code copied" : "Copy code"}
            </button>
            <span className="text-ink-faint">·</span>
            <span>
              On your ereader, open{" "}
              <span className="font-mono text-ink">{receivePlain}</span> and
              type the code.
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-paper-2 p-4 sm:p-5 flex items-start gap-4">
          <div className="size-10 rounded-md bg-leaf-soft text-leaf flex items-center justify-center shrink-0">
            <Check className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-ink truncate">{filename}</p>
            <p className="text-sm text-ink-muted">
              Uploaded · {formatBytes(size)}
            </p>
            <div className="mt-2 text-sm">
              {status.phase === "waiting" ? (
                <span className="inline-flex items-center gap-2 text-ink-muted">
                  <Spinner className="size-4" />
                  <span className="pulse-soft">Waiting for your ereader…</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-leaf">
                  <Check className="size-4" />
                  Claimed by your ereader
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRelease}
            disabled={releasing}
            className="text-ink-muted hover:text-crimson transition-colors disabled:opacity-50 shrink-0"
            title="Delete this upload"
          >
            <Trash className="size-5" />
          </button>
        </div>

        <details className="text-sm text-ink-muted">
          <summary className="cursor-pointer hover:text-ink transition-colors select-none">
            Can&apos;t type on the ereader? Use the link instead
          </summary>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-hairline bg-paper-2 px-3 py-2 font-mono text-ink text-xs sm:text-sm">
            <span className="truncate flex-1">{receiveUrl}</span>
            <button
              type="button"
              onClick={() => copyText(receiveUrl, "url")}
              className="text-ink-muted hover:text-ink transition-colors shrink-0"
            >
              {copied === "url" ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
        </details>
      </div>

      <div className="md:w-[280px] flex flex-col items-center md:items-end gap-2">
        <div className="paper-card rounded-xl p-3 size-[260px] flex items-center justify-center">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="QR code linking to the receive page"
              width={240}
              height={240}
              className="rounded"
            />
          ) : (
            <div className="size-[240px] flex items-center justify-center text-ink-faint text-sm">
              Generating QR…
            </div>
          )}
        </div>
        <p className="text-xs text-ink-muted">
          Scan with your ereader&apos;s camera if it has one
        </p>
      </div>
    </div>
  );
}
