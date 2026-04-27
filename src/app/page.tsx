import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Uploader } from "@/components/Uploader";

const EREADER_AGENT_HINTS = ["kobo", "kindle", "tolino", "ereader", "pocketbook"];

function looksLikeEreader(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return EREADER_AGENT_HINTS.some((hint) => ua.includes(hint));
}

function deriveOrigin(headerList: Headers): string {
  const proto =
    headerList.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const host =
    headerList.get("x-forwarded-host") || headerList.get("host") || "";
  if (!host) return "";
  return `${proto}://${host}`;
}

export default async function Home() {
  const headerList = await headers();
  const userAgent = headerList.get("user-agent") ?? "";
  if (looksLikeEreader(userAgent)) {
    redirect("/r");
  }
  const origin = deriveOrigin(headerList);

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-16">
      <section className="mb-10 sm:mb-14">
        <p className="text-xs uppercase tracking-[0.22em] text-accent-deep font-medium mb-4">
          Step one · on this device
        </p>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-tight text-ink leading-[1.05]">
          Send any book{" "}
          <span className="text-accent">to your ereader</span> without
          cables.
        </h1>
        <p className="mt-5 text-lg text-ink-muted max-w-xl">
          Drop in an EPUB, MOBI, AZW3, PDF, or comic. We&apos;ll mint a
          four-character code. Type it on your Kobo or Kindle&apos;s built-in
          browser to download.
        </p>
      </section>

      <Uploader origin={origin} />

      <section className="mt-16 grid sm:grid-cols-3 gap-6 text-sm">
        <div>
          <div className="font-display text-2xl text-accent">1</div>
          <p className="font-medium text-ink mt-1">Upload here</p>
          <p className="text-ink-muted mt-1">
            We give you a four-character code and a QR.
          </p>
        </div>
        <div>
          <div className="font-display text-2xl text-accent">2</div>
          <p className="font-medium text-ink mt-1">Open the browser on your ereader</p>
          <p className="text-ink-muted mt-1">
            Visit the same URL, type the code, or scan the QR.
          </p>
        </div>
        <div>
          <div className="font-display text-2xl text-accent">3</div>
          <p className="font-medium text-ink mt-1">Tap download</p>
          <p className="text-ink-muted mt-1">
            The book lands in your library, ready to read.
          </p>
        </div>
      </section>

      <section className="mt-16 border-t border-hairline pt-8 text-sm text-ink-muted space-y-3">
        <p>
          <span className="text-ink font-medium">A quick note on conversion.</span>{" "}
          The original send2ereader auto-converted EPUBs to KEPUB / MOBI on
          upload. This rebuild keeps things lean: it ships the file as-is. Most
          modern Kobos read EPUB natively; Kindles released after 2022 do too
          (the Send to Kindle service accepts EPUB now).
        </p>
        <p>
          For older Kindles, convert your EPUB to MOBI or AZW3 with Calibre
          before uploading.
        </p>
      </section>
    </div>
  );
}
