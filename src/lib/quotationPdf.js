import { jsPDF } from "jspdf";

export function formatINRQ(n) {
  n = Math.round(n);
  const s = Math.abs(n).toString();
  let r;
  if (s.length <= 3) r = s;
  else {
    const l3 = s.slice(-3);
    const rest = s.slice(0, -3);
    r = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + l3;
  }
  return (n < 0 ? "-" : "") + "₹" + r;
}

let logoDataUrl = null;
async function getLogoDataUrl() {
  if (logoDataUrl) return logoDataUrl;
  try {
    const res = await fetch("/logo.png");
    const blob = await res.blob();
    logoDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    logoDataUrl = null;
  }
  return logoDataUrl;
}

let cachedFontData = null;
async function loadPdfFonts(doc) {
  if (!cachedFontData) {
    async function fetchBase64(url) {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(
          `Could not load ${url} (HTTP ${res.status}). Make sure NotoSans-Regular.ttf and NotoSans-Bold.ttf are in the public/ folder.`
        );
      }
      const buf = await res.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    }
    // Real font files (not jsPDF's built-in Helvetica/Times) — the standard PDF
    // fonts have no ₹ glyph at all, which is why it renders wrong otherwise.
    const [notoRegular, notoBold] = await Promise.all([
      fetchBase64("/NotoSans-Regular.ttf"),
      fetchBase64("/NotoSans-Bold.ttf"),
    ]);
    cachedFontData = { notoRegular, notoBold };
  }
  doc.addFileToVFS("NotoSans-Regular.ttf", cachedFontData.notoRegular);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", cachedFontData.notoBold);
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
}

export async function downloadQuotationPDF(q, preparedByName) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await loadPdfFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 50;
  let y = 66;

  const logo = await getLogoDataUrl();
  const circleR = 22;
  const brandPink = [157, 29, 76];
  doc.setFillColor(...brandPink);
  doc.circle(margin + circleR, y - 8, circleR, "F");
  if (logo) {
    try {
      doc.addImage(logo, "PNG", margin + circleR - 13, y - 21, 26, 26);
    } catch (e) {
      /* logo optional */
    }
  }

  const textX = margin + circleR * 2 + 14;
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text("PinkCity", textX, y - 2);

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(8);
  let sx = textX;
  const seg = (str, color) => {
    doc.setTextColor(...color);
    doc.text(str, sx, y + 12, { charSpace: 0.6 });
    sx += doc.getTextWidth(str) + str.length * 0.6;
  };
  seg("PROPERTIES ", [140, 140, 140]);
  seg("&", brandPink);
  seg(" CONSULTANTS", [140, 140, 140]);

  doc.setDrawColor(230, 220, 210);
  doc.line(margin, y + 28, pageWidth - margin, y + 28);
  y += 62;

  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.setFont("NotoSans", "bold");
  doc.text("Property Quotation", margin, y);
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(10);
  doc.setTextColor(130, 130, 130);
  const quoteRef = q.quote_number ? "PC-Q" + q.quote_number : "Draft";
  const dateStr = new Date(q.created_at || Date.now()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.text(`Ref: ${quoteRef}   ·   Date: ${dateStr}`, margin, y + 16);
  y += 40;

  if (q.client_name) {
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text("Prepared for: " + q.client_name, margin, y);
    y += 26;
  }

  const rows = [
    ["Plot No.", String(q.plot_no)],
    ["Plot Size", q.plot_size_gaj + " Gaj"],
    ["Rate", formatINRQ(q.rate_per_gaj) + " / Gaj"],
    ["Corner Plot", q.corner_plot ? "Yes (+5%)" : "No"],
    ["Park Facing", q.park_facing ? "Yes (+5%)" : "No"],
  ];
  doc.setFontSize(11);
  rows.forEach((r) => {
    doc.setFont("NotoSans", "normal");
    doc.setTextColor(130, 130, 130);
    doc.text(r[0], margin, y);
    doc.setFont("NotoSans", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(r[1], margin + 170, y);
    y += 22;
  });

  y += 8;
  doc.setDrawColor(230, 220, 210);
  doc.line(margin, y, pageWidth - margin, y);
  y += 28;

  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.setFont("NotoSans", "normal");
  doc.text("Base Price", margin, y);
  doc.text(formatINRQ(q.base_price), pageWidth - margin, y, { align: "right" });
  y += 20;
  if (q.corner_plot) {
    doc.text("Corner Plot Extra (5%)", margin, y);
    doc.text("+" + formatINRQ(q.corner_extra), pageWidth - margin, y, { align: "right" });
    y += 20;
  }
  if (q.park_facing) {
    doc.text("Park Facing Extra (5%)", margin, y);
    doc.text("+" + formatINRQ(q.park_extra), pageWidth - margin, y, { align: "right" });
    y += 20;
  }

  y += 10;
  doc.setFillColor(250, 240, 244);
  doc.rect(margin - 10, y - 18, pageWidth - 2 * margin + 20, 36, "F");
  doc.setFontSize(14);
  doc.setFont("NotoSans", "bold");
  doc.setTextColor(...brandPink);
  doc.text("Total Quoted Price", margin, y + 4);
  doc.text(formatINRQ(q.total_price), pageWidth - margin, y + 4, { align: "right" });
  y += 56;

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(160, 160, 160);
  doc.text(
    "This is an indicative quotation, subject to verification and availability. Not a final offer or booking confirmation.",
    margin,
    y,
    { maxWidth: pageWidth - 2 * margin }
  );
  y += 34;

  doc.setDrawColor(230, 220, 210);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text("Prepared by: " + (q.created_by_name || preparedByName || ""), margin, y);
  y += 15;
  doc.text("PinkCity Properties  ·  pinkcityproperties.com", margin, y);

  const filename = "Quotation-" + (q.plot_no || "plot") + ".pdf";
  const pdfBlob = doc.output("blob");
  const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });
  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({ files: [pdfFile], title: filename });
      return;
    } catch (e) {
      if (e.name === "AbortError") return; // user cancelled the share sheet
      // fall through to direct download below
    }
  }
  doc.save(filename);
}
