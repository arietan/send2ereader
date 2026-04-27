# send2ereader

A Vercel-native rewrite of the classic [`daniel-j/send2ereader`](https://github.com/daniel-j/send2ereader). Drop a book on your phone or laptop, type a four-character code on your Kobo or Kindle's built-in browser, and the file lands in its library. No account, no app, no cable.

The original Koa server has been replaced with **Next.js 16 on App Router** and **Vercel Blob** for storage, so the whole thing runs as a handful of serverless functions plus a static UI.

## What's different from the upstream

The original auto-converted EPUBs (KEPUB for Kobo, MOBI for Kindle via `kindlegen`) and cropped PDF margins. None of those binaries can run on Vercel, and `kindlegen` was discontinued by Amazon anyway, so this rebuild **ships files as-is**.

That's not a regression for most users:
- Modern Kobo firmware reads EPUB natively.
- Kindles released after 2022 read EPUB natively (Send-to-Kindle accepts EPUB now).
- Older Kindles: convert your EPUB to MOBI / AZW3 with [Calibre](https://calibre-ebook.com/) before uploading.

If conversion ever lands here, it'll happen client-side in WebAssembly.

## How it works

```
[Phone]                            [Vercel Blob]                     [Ereader]
  |                                       |                              |
  | 1. POST /api/blob-upload  ───────────►|                              |
  | 2. PUT <file>  ──────────────────────►|                              |
  | 3. POST /api/finalize  (mints code)   |                              |
  |◄────── 4-char code + QR               |                              |
                                          |                              |
                                          |◄── 4. POST /api/claim ───────|
                                          |       (with code)            |
                                          |── 5. signed download URL ───►|
                                          |── 6. GET <file>?download=1 ──|
```

- Files are uploaded directly from the browser to Vercel Blob using `@vercel/blob/client`, so the 4.5MB serverless body limit doesn't apply. Limit is 200MB by default — set in `src/lib/file-types.ts`.
- Codes use a 28-character alphabet (`23456789ACDEFGHJKLMNPRSTUVWXYZ`) that excludes ambiguous shapes like `0/O` and `1/I`, matching the original.
- Metadata for each upload is itself a small JSON blob (`meta/<CODE>.json`), so we don't need a separate database. `POST /api/finalize` retries until it finds a code with no existing meta blob.
- A Vercel Cron at `/api/cleanup` sweeps every meta + file pair older than one hour. On Hobby plans cron only runs once per day, so the absolute upper bound on storage is around 25 hours; on Pro you can set the schedule to hourly (or finer) by editing `vercel.json`.

## Local development

You need Node.js 20+ and a Vercel Blob store.

```bash
git clone <your fork>
cd send2ereader
npm install
```

Create a `.env.local` with a Vercel Blob read/write token. The fastest path is to link the project to Vercel and pull env vars:

```bash
npx vercel link
npx vercel env pull .env.local
```

If you don't want to use the Vercel CLI, generate a token in the Vercel dashboard under **Storage → Blob → your store → Read/Write tokens**, and put it in `.env.local`:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
# Optional: protects /api/cleanup so only your cron can hit it.
CRON_SECRET=some-long-random-string
```

Then:

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint
```

## Deploy to Vercel

1. Push your fork to GitHub.
2. In Vercel, **Add New → Project**, pick the repo, accept defaults (Next.js framework auto-detected, no build command override needed).
3. Under **Storage**, create or attach a Blob store. Vercel will inject `BLOB_READ_WRITE_TOKEN` automatically.
4. (Optional, recommended) Under **Settings → Environment Variables**, add `CRON_SECRET` with a long random value.
5. Deploy. The `vercel.json` ships a cron that pings `/api/cleanup` once a day (Hobby plans are capped at daily). On Pro, change the schedule to `0 * * * *` for hourly cleanup.

That's it — your fork is live at `https://<your-project>.vercel.app`.

## API surface

| Method | Path                | Purpose                                                              |
| ------ | ------------------- | -------------------------------------------------------------------- |
| `POST` | `/api/blob-upload`  | `@vercel/blob/client` `handleUpload` route. Issues client tokens.    |
| `POST` | `/api/finalize`     | Mints a 4-char code and writes `meta/<CODE>.json`.                   |
| `GET`  | `/api/status`       | Polled by the sender to see if the ereader has claimed the file.    |
| `POST` | `/api/claim`        | Receiver enters the code; gets back a download URL.                  |
| `POST` | `/api/release`      | Sender abandons the upload; deletes file + meta.                     |
| `GET`  | `/api/cleanup`      | Cron sweep of expired uploads (TTL = 1 hour, runs daily on Hobby).   |

## Project layout

```
src/
├── app/
│   ├── layout.tsx              # site shell (header, footer, fonts, theme)
│   ├── page.tsx                # sender homepage; redirects ereader UAs to /r
│   ├── r/page.tsx              # receiver page
│   ├── globals.css             # Tailwind v4 + paper/ink design tokens
│   └── api/<route>/route.ts    # six route handlers (see table above)
├── components/
│   ├── Uploader.tsx            # file picker, upload progress, error states
│   ├── CodeDisplay.tsx         # big code tiles, QR, status polling
│   ├── ReceiveForm.tsx         # 4-input code box, claim flow, download CTA
│   └── Icons.tsx               # small inline SVG icon set
└── lib/
    ├── code.ts                 # 4-char code alphabet + uniqueness check
    ├── file-types.ts           # allowed extensions / mimetypes / size cap
    └── meta.ts                 # read/write/list/delete meta blobs
```

## Configuration knobs

All in `src/lib/file-types.ts` and `src/app/api/cleanup/route.ts`:

- `MAX_FILE_SIZE` — default 200 MB.
- `ALLOWED_EXTENSIONS` — EPUB, KEPUB, MOBI, AZW, AZW3, PDF, CBZ, CBR, TXT, HTML.
- `TTL_MS` — default 1 hour. The cron in `vercel.json` runs daily on Hobby; bump the schedule to hourly on Pro.

## License

MIT, same as the upstream. The original is © Daniel Jönsson and contributors; this rebuild is a fork.
