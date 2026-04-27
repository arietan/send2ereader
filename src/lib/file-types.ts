export const ALLOWED_EXTENSIONS = new Set([
  "epub",
  "kepub",
  "mobi",
  "azw",
  "azw3",
  "pdf",
  "cbz",
  "cbr",
  "txt",
  "html",
]);

export const ALLOWED_CONTENT_TYPES = [
  "application/epub+zip",
  "application/epub",
  "application/x-mobipocket-ebook",
  "application/vnd.amazon.ebook",
  "application/pdf",
  "application/vnd.comicbook+zip",
  "application/vnd.comicbook-rar",
  "application/zip",
  "application/x-rar-compressed",
  "application/x-rar",
  "application/octet-stream",
  "text/plain",
  "text/html",
];

export const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

export function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx === -1) return "";
  return filename.slice(idx + 1).toLowerCase();
}

export function isAllowedFilename(filename: string): boolean {
  const ext = getExtension(filename);
  return ALLOWED_EXTENSIONS.has(ext);
}

export function sanitizeFilename(filename: string): string {
  // Strip directory separators and control characters; keep readable for ereader display.
  const base = filename.split(/[/\\]/).pop() ?? filename;
  return base.replace(/[\x00-\x1f]/g, "").trim() || "ebook";
}

export function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}
