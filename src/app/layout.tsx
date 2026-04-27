import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "send2ereader — Send any book to your Kobo or Kindle",
  description:
    "A no-account-needed bridge between your phone and your ereader. Upload an EPUB, MOBI, PDF, or CBZ on one device, type a four-letter code on the other.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable} antialiased`}
    >
      <body className="min-h-screen bg-bg text-ink">
        <header className="border-b border-hairline">
          <div className="max-w-5xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="font-display text-xl sm:text-2xl tracking-tight text-ink hover:text-accent-deep transition-colors"
            >
              send<span className="text-accent">2</span>ereader
            </Link>
            <nav className="flex items-center gap-5 text-sm text-ink-muted">
              <Link href="/" className="hover:text-ink transition-colors">
                Send
              </Link>
              <Link href="/r" className="hover:text-ink transition-colors">
                Receive
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-hairline mt-24">
          <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between text-xs text-ink-muted">
            <div>
              A small bridge between your library and your ereader.
            </div>
            <div className="font-mono">
              MIT · forked from{" "}
              <a
                href="https://github.com/daniel-j/send2ereader"
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent-deep underline-offset-2 hover:underline"
              >
                daniel-j/send2ereader
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
