import { jsPDF } from "jspdf";
import { formatINRQ, loadPdfFonts, getLogoDataUrl } from "./quotationPdf";
import { RESALE_STATUS, formatGaj } from "./resale";
import { loadPlanPages } from "./planPages";

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

export async function createBrochure(plot, opts = {}, deps = {}) {
  const { includeRegistration = true, includeNotes = false, includeFullPlan = true, contactName = "", contactMobile = "" } = opts;
  const loadPlan = deps.loadPlan || loadPlanPages;

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

  // Site plan (an image, or the pages of a PDF): a preview here, full size on the pages after
  const footerTop = H - 100;
  let plan = { pages: [], total: 0 };
  let planStatus = plot.site_plan_path ? "failed" : "none";
  if (plot.site_plan_path) {
    try {
      plan = await loadPlan(plot);
      if (plan.pages.length) planStatus = "embedded";
    } catch {
      /* the brochure still goes out, with a note instead of the plan */
    }
  }
  const preview = plan.pages[0];
  let previewDrawn = false;
  if (preview) {
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
      const scale = Math.min((boxW - 2 * pad) / preview.w, (boxH - 2 * pad) / preview.h);
      const iw = preview.w * scale;
      const ih = preview.h * scale;
      doc.addImage(preview.dataUrl, "JPEG", M + (boxW - iw) / 2, boxY + (boxH - ih) / 2, iw, ih);
      previewDrawn = true;
      if (includeFullPlan) {
        doc.setFont("NotoSans", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...MUTED);
        text("Full-size plan on the next page" + (plan.pages.length > 1 ? "s" : ""), W - M, y, { align: "right" });
      }
    }
  }
  if (!previewDrawn && plot.site_plan_path) {
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

  // Full-size plan pages (each in the orientation that suits the plan)
  if (includeFullPlan && previewDrawn) {
    const contactLine = contactName ? `Contact: ${contactName}${contactMobile ? " · " + contactMobile : ""}` : "";
    plan.pages.forEach((img, i) => {
      const landscape = img.w / img.h > 1.15;
      doc.addPage("a4", landscape ? "l" : "p");
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      doc.setFillColor(...PINK);
      doc.rect(0, 0, PW, 42, "F");
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      text("PinkCity Properties & Consultants", M, 26);
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(10);
      const more = plan.total > 1 ? `  ·  page ${i + 1} of ${plan.total}` : "";
      text(`Site plan  ·  ${plot.scheme}  ·  Plot ${plot.plot_number}${more}`, PW - M, 26, { align: "right" });
      const boxY = 58;
      const boxW = PW - 2 * M;
      const boxH = PH - boxY - 48;
      const scale = Math.min(boxW / img.w, boxH / img.h);
      const iw = img.w * scale;
      const ih = img.h * scale;
      doc.addImage(img.dataUrl, "JPEG", M + (boxW - iw) / 2, boxY + (boxH - ih) / 2, iw, ih);
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      if (contactLine) text(contactLine, M, PH - 22);
      text("pinkcityproperties.com", PW - M, PH - 22, { align: "right" });
    });
    if (plan.total > plan.pages.length) {
      // the plan has more pages than the brochure carries: say so on the last one
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(`Showing the first ${plan.pages.length} of ${plan.total} plan pages. Ask for the full plan.`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 36, { align: "center" });
    }
  }

  const safe = (s) => String(s).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = `${safe(plot.scheme)}-Plot-${safe(plot.plot_number)}-Brochure.pdf`;
  return { blob: doc.output("blob"), filename, planStatus };
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
