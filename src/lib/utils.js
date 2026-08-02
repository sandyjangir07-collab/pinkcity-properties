// Downscale + re-encode photos before they ever leave the device — ported
// verbatim from the production site's upload pipeline (listing.html /
// dashboard.html / employees.html all share this exact function).
export async function compressImageFile(file, maxDimension = 1600, quality = 0.85) {
  if (!file || !file.type || !file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = bitmap;
    if (width <= maxDimension && height <= maxDimension && file.size < 500 * 1024) {
      bitmap.close && bitmap.close();
      return file;
    }
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close && bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch (e) {
    console.error("Image compression skipped:", e);
    return file;
  }
}

// Reads a (possibly just-compressed) File into an ArrayBuffer before upload.
// iOS can hand out a File reference before its data is fully available —
// especially iCloud-optimized photos or fresh camera captures — and handing
// Supabase the raw File in that window can silently upload an empty body.
// Reading it into memory explicitly first is the fix used sitewide.
export async function fileToUploadableBuffer(file) {
  const buffer = await file.arrayBuffer();
  if (!buffer.byteLength) {
    throw new Error("File appears to be empty (0 bytes) — please try selecting it again.");
  }
  return buffer;
}

export async function uploadToBucket(sb, bucket, path, file) {
  const compressed = await compressImageFile(file);
  const buffer = await fileToUploadableBuffer(compressed);
  const ext = compressed.name.split(".").pop();
  const { error: upErr } = await sb.storage
    .from(bucket)
    .upload(path, buffer, { cacheControl: "3600", upsert: false, contentType: compressed.type || `image/${ext}` });
  if (upErr) throw upErr;
  const { data: pub } = sb.storage.from(bucket).getPublicUrl(path);
  return pub.publicUrl;
}

export function formatINR(n) {
  if (n === null || n === undefined || n === "") return "—";
  return "₹" + Number(n).toLocaleString("en-IN");
}

export function formatDate(d, opts) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(
    "en-IN",
    opts || { day: "numeric", month: "short", year: "numeric" }
  );
}

export function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// Tailwind class-merge helper (shadcn convention) — for the components being
// migrated to the new design system.
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
