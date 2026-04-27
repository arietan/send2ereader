import { del, head, list, put, type ListBlobResult } from "@vercel/blob";

export type Meta = {
  code: string;
  filename: string;
  contentType: string;
  size: number;
  blobUrl: string;
  blobPathname: string;
  createdAt: string;
  claimedAt: string | null;
  agentHint: string | null;
};

export function metaPathname(code: string): string {
  return `meta/${code}.json`;
}

export async function writeMeta(meta: Meta): Promise<void> {
  await put(metaPathname(meta.code), JSON.stringify(meta), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

export async function readMeta(code: string): Promise<Meta | null> {
  let blob;
  try {
    blob = await head(metaPathname(code));
  } catch {
    return null;
  }
  // Cache-bust by appending a timestamp; meta blobs have cacheControlMaxAge: 0
  // but CDN edges may still serve a slightly stale copy without this.
  const url = `${blob.url}?t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  try {
    return (await res.json()) as Meta;
  } catch {
    return null;
  }
}

export async function deleteMetaAndFile(meta: Meta): Promise<void> {
  await Promise.allSettled([
    del(meta.blobUrl).catch(() => undefined),
    del(metaPathname(meta.code)).catch(() => undefined),
  ]);
}

export async function listAllMeta(): Promise<Meta[]> {
  const items: Meta[] = [];
  let cursor: string | undefined = undefined;
  do {
    const result: ListBlobResult = await list({
      prefix: "meta/",
      cursor,
      limit: 1000,
    });
    cursor = result.cursor;
    for (const blob of result.blobs) {
      try {
        const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) continue;
        const meta = (await res.json()) as Meta;
        items.push(meta);
      } catch {
        // skip malformed entries
      }
    }
  } while (cursor);
  return items;
}
