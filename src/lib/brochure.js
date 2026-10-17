import { jsPDF } from "jspdf";
import { formatINRQ, loadPdfFonts, getLogoDataUrl } from "./quotationPdf";
import { RESALE_STATUS, formatGaj, isImagePath, BUCKET_PLANS, signedUrl } from "./resale";

// One-page customer brochure for a resale plot. Built only from the plot's
// public facts (never owner details) so an associate can send it as-is.

const PINK = [196, 56, 104];
const PINK_DARK = [157, 29, 76];
const INK = [36, 26, 30];
const MUTED = [111, 100, 104];
const TINT = [255, 241, 245];
const BORDER = [250, 211, 222];
const STATUS_COLORS = {
  available: { bg: [220, 252, 231], fg: [22, 101, 52] },
  reserved: { bg: [254, 243, 199], fg: [146, 64, 14] },
  sold: { bg: [238, 234, 234], fg: [85, 75, 79] },
  unavailable: { bg: [254, 226, 226], fg: [185, 28, 28] },
};

// Browser: fetch the plan and re-encode as a compact JPEG with its real size.
export async function loadPlanImage(url, maxDim = 1800) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn't load the site plan image.");
  const blob = await res.blob();
  let source;
  let w;
  let h;
  if (typeof createImageBitmap === "function") {
    source = await createImageBitmap(blob);
    w = source.width;
    h = source.height;
  } else {
    const objectUrl = URL.createObjectURL(blob);
    source = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });
    w = source.naturalWidth;
    h = source.naturalHeight;
  }
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(source, 0, 0, cw, ch);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.88), w: cw, h: ch };
}

export async function createBrochure(plot, opts = {}, deps = {}) {
  const { includeRegistration = true, includeNotes = false, contactName = "", contactMobile = "" } = opts;
  const loadImage = deps.loadImage || (async (p) => loadPlanImage(await signedUrl(BUCKET_PLANS, p.site_plan_path, 300)));

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await loadPdfFonts(doc);
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const text = (s, x, y, o) => doc.text(String(s), x, y, o);

  // Header band
  doc.setFillColor(...PINK);
  doc.rect(0, 0, W, 92, "F");
  doc.setFillColor(...PINK_DARK);
  doc.circle(M + 24, 46, 24, "F");
  const logo = await getLogoDataUrl();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", M + 10, 32, 28, 28);
    } catch {
      /* logo is decorative */
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(17);
  text("PinkCity Properties & Consultants", M + 62, 43);
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 226, 235);
  text("Verified resale plots in Jaipur", M + 62, 60);
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  text("PLOT FOR RESALE", W - M, 50, { align: "right", charSpace: 1 });

  // Title, plot number, location, status
  let y = 134;
  const st = RESALE_STATUS[plot.status] || RESALE_STATUS.available;
  const sc = STATUS_COLORS[plot.status] || STATUS_COLORS.available;
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(10.5);
  const pillW = doc.getTextWidth(st.label) + 26;
  doc.setFillColor(...sc.bg);
  doc.roundedRect(W - M - pillW, y - 16, pillW, 24, 12, 12, "F");
  doc.setTextColor(...sc.fg);
  text(st.label, W - M - pillW / 2, y, { align: "center" });

  doc.setFontSize(25);
  doc.setTextColor(...INK);
  const titleLines = doc.splitTextToSize(plot.scheme, W - 2 * M - pillW - 16);
  doc.text(titleLines, M, y);
  y += (titleLines.length - 1) * 28 + 26;
  doc.setFontSize(15);
  doc.setTextColor(...PINK);
  text(`Plot No. ${plot.plot_number}`, M, y);
  y += 19;
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  text(plot.location, M, y);

  // Total demand
  y += 22;
  doc.setFillColor(...TINT);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(1);
  doc.roundedRect(M, y, W - 2 * M, 104, 14, 14, "FD");
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  text("TOTAL DEMAND", M + 22, y + 27, { charSpace: 0.8 });
  doc.setFontSize(33);
  doc.setTextColor(...PINK_DARK);
  text(formatINRQ(plot.total_demand), M + 22, y + 66);
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...MUTED);
  text(`${formatGaj(plot.area_gaj)} × ${formatINRQ(plot.rate_per_gaj)} per Gaj`, M + 22, y + 88);
  y += 104 + 24;

  // Key facts, three per row
  const facts = [
    ["Area", formatGaj(plot.area_gaj)],
    ["Rate per Gaj", formatINRQ(plot.rate_per_gaj)],
    includeRegistration && plot.registration_amount != null ? ["Registration", formatINRQ(plot.registration_amount)] : null,
    plot.facing ? ["Facing", plot.facing] : null,
    plot.dimensions ? ["Plot dimensions", plot.dimensions] : null,
    ["Availability", st.label],
  ].filter(Boolean);
  const colW = (W - 2 * M) / 3;
  facts.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = M + col * colW;
    const fy = y + row * 52;
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    text(label.toUpperCase(), x, fy, { charSpace: 0.6 });
    doc.setFontSize(13.5);
    doc.setTextColor(...INK);
    text(value, x, fy + 19, { maxWidth: colW - 10 });
  });
  y += Math.ceil(facts.length / 3) * 52 + 4;

  // Optional notes (off unless the associate switches them on)
  if (includeNotes && plot.notes && plot.notes.trim()) {
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    text("ABOUT THIS PLOT", M, y, { charSpace: 0.6 });
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(plot.notes.trim(), W - 2 * M).slice(0, 5);
    doc.text(lines, M, y + 16);
    y += 16 + lines.length * 14 + 12;
  }

  // Site plan
  const footerTop = H - 100;
  let planDrawn = false;
  if (plot.site_plan_path && isImagePath(plot.site_plan_path)) {
    try {
      const img = await loadImage(plot);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...INK);
      text("Site plan", M, y);
      const boxY = y + 10;
      const boxH = footerTop - boxY - 16;
      const boxW = W - 2 * M;
      if (boxH > 90) {
        doc.setDrawColor(...BORDER);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(M, boxY, boxW, boxH, 12, 12, "FD");
        const pad = 10;
        const scale = Math.min((boxW - 2 * pad) / img.w, (boxH - 2 * pad) / img.h);
        const iw = img.w * scale;
        const ih = img.h * scale;
        doc.addImage(img.dataUrl, "JPEG", M + (boxW - iw) / 2, boxY + (boxH - ih) / 2, iw, ih);
        planDrawn = true;
      }
    } catch {
      /* falls through to the note below */
    }
  }
  if (!planDrawn && plot.site_plan_path) {
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...MUTED);
    text("Site plan available on request.", M, y + 6);
  }

  // Footer: who to contact
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(1);
  doc.line(M, H - 84, W - M, H - 84);
  const fy = H - 62;
  if (contactName) {
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    text("CONTACT", M, fy - 4, { charSpace: 0.6 });
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    text(contactName, M, fy + 14);
    if (contactMobile) {
      doc.setTextColor(...PINK_DARK);
      text(contactMobile, M, fy + 31);
    }
  }
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PINK_DARK);
  text("pinkcityproperties.com", W - M, fy + 14, { align: "right" });
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  text("Details are indicative and subject to confirmation at the time of booking.", W - M, fy + 29, { align: "right" });

  const safe = (s) => String(s).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = `${safe(plot.scheme)}-Plot-${safe(plot.plot_number)}-Brochure.pdf`;
  return { blob: doc.output("blob"), filename };
}

// Native share sheet with the PDF attached (WhatsApp etc.); download as a fallback.
export async function shareBrochure(blob, filename, text) {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename, text });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "downloaded";
}
