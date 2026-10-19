import { BUCKET_PLANS, signedUrl, isImagePath } from "./resale";

// Turns a plot's site plan (an image, or a PDF of one or more pages) into JPEG
// pictures { dataUrl, w, h } that the customer brochure can embed.

const defaultCanvas = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

// Draw an already-decoded bitmap/image onto a white canvas as a compact JPEG.
function encode(source, w, h, maxDim, createCanvas) {
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = createCanvas(cw, ch);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(source, 0, 0, cw, ch);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.88), w: cw, h: ch };
}

export async function imageBlobToPage(blob, maxDim = 2000, createCanvas = defaultCanvas) {
  if (typeof createImageBitmap === "function") {
    const bmp = await createImageBitmap(blob);
    return encode(bmp, bmp.width, bmp.height, maxDim, createCanvas);
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = objectUrl;
    });
    return encode(img, img.naturalWidth, img.naturalHeight, maxDim, createCanvas);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// `pdfjs` is the pdf.js module (injected so this can be tested outside a browser).
// Plans exported from CAD tools often use the standard PDF fonts without storing
// them in the file, so the reader needs its own copies (shipped in /pdf-standard-fonts/).
const STANDARD_FONTS = `${import.meta.env?.BASE_URL || "/"}pdf-standard-fonts/`;

export async function renderPdfToPages(pdfjs, data, { maxPages = 3, maxDim = 2000, createCanvas = defaultCanvas, standardFontDataUrl = STANDARD_FONTS } = {}) {
  // pdf.js insists on a plain Uint8Array (not a Buffer or other view), so copy into one.
  const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)) : new Uint8Array(data);
  const pdf = await pdfjs.getDocument({ data: bytes, standardFontDataUrl }).promise;
  const total = pdf.numPages;
  const pages = [];
  for (let i = 1; i <= Math.min(total, maxPages); i++) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(4, maxDim / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const w = Math.ceil(viewport.width);
    const h = Math.ceil(viewport.height);
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push({ dataUrl: canvas.toDataURL("image/jpeg", 0.88), w, h });
    page.cleanup();
  }
  await pdf.destroy();
  return { pages, total };
}

// pdf.js is large, so it is only fetched when a PDF plan is actually used.
// The "legacy" build keeps this working on older iPhones.
async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.min.mjs");
  const worker = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  return pdfjs;
}

// Browser: fetch the plot's plan from private storage and return its pages.
export async function loadPlanPages(plot, opts = {}) {
  if (!plot.site_plan_path) return { pages: [], total: 0 };
  const url = await signedUrl(BUCKET_PLANS, plot.site_plan_path, 300);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn't load the site plan.");
  if (isImagePath(plot.site_plan_path)) {
    return { pages: [await imageBlobToPage(await res.blob(), opts.maxDim || 2000)], total: 1 };
  }
  const data = await res.arrayBuffer();
  return renderPdfToPages(await loadPdfjs(), data, { maxPages: opts.maxPages || 3, maxDim: opts.maxDim || 2000 });
}
