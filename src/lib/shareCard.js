import { formatINR } from "./utils";
import { formatGaj, RESALE_STATUS, COMPANY_NAME, COMPANY_PHONE_SHOWN } from "./resale";

// A ready-to-send picture of a plot (1080 × 1350, WhatsApp-friendly): property facts and the
// sharing associate's contact. Never contains owner details — it only reads the public listing facts.

const W = 1080;
const H = 1350;
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '"Inter", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif'; // has the ₹ glyph

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth, startSize, weight, family) {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    size -= 2;
  } while (ctx.measureText(text).width > maxWidth && size > 24);
}

function loadLogo() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/logo.png";
  });
}

export async function drawShareCard(plot, { contactName, contactPhone, link } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const logo = await loadLogo();

  // Background
  ctx.fillStyle = "#FBF6EE";
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, 360);
  g.addColorStop(0, "#B01F4F");
  g.addColorStop(1, "#8E1640");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 330);

  // Brand
  if (logo) ctx.drawImage(logo, 56, 52, 84, 84);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 34px ${SANS}`;
  ctx.fillText("PinkCity", logo ? 160 : 56, 88);
  ctx.font = `500 24px ${SANS}`;
  ctx.fillStyle = "rgba(255,255,255,.8)";
  ctx.fillText("Properties & Consultants", logo ? 160 : 56, 124);

  const st = RESALE_STATUS[plot.status] || RESALE_STATUS.available;
  ctx.font = `800 22px ${SANS}`;
  const tag = `RESALE PLOT · ${st.label.toUpperCase()}`;
  const tw = ctx.measureText(tag).width + 48;
  rounded(ctx, W - 56 - tw, 62, tw, 52, 26);
  ctx.fillStyle = "rgba(255,255,255,.18)";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(tag, W - 56 - tw + 24, 96);

  // Scheme + plot
  ctx.fillStyle = "#fff";
  fitText(ctx, plot.scheme, W - 112, 64, "700", SERIF);
  ctx.fillText(plot.scheme, 56, 232);
  ctx.font = `600 34px ${SANS}`;
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.fillText(`Plot ${plot.plot_number}  ·  ${plot.location}`, 56, 288);

  // Total demand panel
  rounded(ctx, 56, 372, W - 112, 250, 36);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "rgba(34,26,23,.08)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(34,26,23,.5)";
  ctx.font = `700 24px ${SANS}`;
  ctx.fillText("TOTAL DEMAND", 96, 430);
  ctx.fillStyle = "#8E1640";
  fitText(ctx, formatINR(plot.total_demand), W - 192, 108, "700", SANS);
  ctx.fillText(formatINR(plot.total_demand), 96, 540);
  ctx.fillStyle = "rgba(34,26,23,.55)";
  ctx.font = `500 28px ${SANS}`;
  ctx.fillText(`${formatGaj(plot.area_gaj)} × ${formatINR(plot.rate_per_gaj)} per Gaj`, 96, 590);

  // Facts grid
  const facts = [
    ["AREA", formatGaj(plot.area_gaj)],
    ["FACING", plot.facing || "—"],
    ["PLOT SIZE", plot.dimensions || "—"],
    ["REGISTRATION", plot.registration_amount != null ? formatINR(plot.registration_amount) : "—"],
  ];
  const cw = (W - 112 - 24) / 2;
  facts.forEach(([label, value], i) => {
    const x = 56 + (i % 2) * (cw + 24);
    const y = 660 + Math.floor(i / 2) * 150;
    rounded(ctx, x, y, cw, 126, 28);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = "rgba(34,26,23,.08)";
    ctx.stroke();
    ctx.fillStyle = "rgba(34,26,23,.45)";
    ctx.font = `700 22px ${SANS}`;
    ctx.fillText(label, x + 32, y + 46);
    ctx.fillStyle = "#221A17";
    fitText(ctx, String(value), cw - 64, 40, "700", SANS);
    ctx.fillText(String(value), x + 32, y + 98);
  });

  // Contact footer
  rounded(ctx, 56, 990, W - 112, 280, 36);
  ctx.fillStyle = "#B01F4F";
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.font = `700 24px ${SANS}`;
  ctx.fillText(contactName ? "CALL / WHATSAPP" : "ENQUIRE", 96, 1056);
  ctx.fillStyle = "#fff";
  const name = contactName || COMPANY_NAME;
  fitText(ctx, name, W - 192, 50, "700", SANS);
  ctx.fillText(name, 96, 1118);
  ctx.font = `700 54px ${SANS}`;
  ctx.fillText(contactPhone || COMPANY_PHONE_SHOWN, 96, 1186);
  if (link) {
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.font = `500 24px ${SANS}`;
    ctx.fillText(link.replace(/^https?:\/\//, ""), 96, 1236);
  }

  ctx.fillStyle = "rgba(34,26,23,.4)";
  ctx.font = `500 22px ${SANS}`;
  ctx.textAlign = "center";
  ctx.fillText("Demand rates are indicative and subject to confirmation.", W / 2, 1316);
  ctx.textAlign = "left";
  return canvas;
}

export async function shareCardFile(plot, opts) {
  const canvas = await drawShareCard(plot, opts);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Couldn't make the image.");
  const name = `${plot.scheme}-plot-${plot.plot_number}.png`.replace(/\s+/g, "-");
  return new File([blob], name, { type: "image/png" });
}

// Share the picture through the phone's share sheet (WhatsApp etc.); download it as a fallback.
export async function shareCard(plot, opts) {
  const file = await shareCardFile(plot, opts);
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `${plot.scheme} — Plot ${plot.plot_number}` });
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancelled";
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
