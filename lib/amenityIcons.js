// Amenities are free-typed by the team, not picked from a fixed list, so this
// matches by keyword within the text rather than requiring an exact string —
// "Solar Street Lights" and "Street Lighting" should both get a light icon.
const RULES = [
  { keywords: ["solar"], icon: "☀️", bg: "bg-amber-100" },
  { keywords: ["street light", "lighting", "light"], icon: "💡", bg: "bg-amber-100" },
  { keywords: ["water"], icon: "💧", bg: "bg-sky-100" },
  { keywords: ["road", "tile", "paver", "pathway", "path"], icon: "🛣️", bg: "bg-slate-100" },
  { keywords: ["gate", "township", "colony", "boundary", "wall", "fenc"], icon: "🚪", bg: "bg-blue-100" },
  { keywords: ["plant", "tree", "garden", "landscap", "green"], icon: "🌳", bg: "bg-green-100" },
  { keywords: ["park"], icon: "🌳", bg: "bg-emerald-100" },
  { keywords: ["security", "guard", "surveillance", "cctv"], icon: "🔒", bg: "bg-red-100" },
  { keywords: ["power", "electric", "backup", "generator"], icon: "⚡", bg: "bg-orange-100" },
  { keywords: ["drain", "sewer", "sewage"], icon: "🚰", bg: "bg-sky-100" },
  { keywords: ["gym", "fitness"], icon: "🏋️", bg: "bg-red-100" },
  { keywords: ["swim", "pool"], icon: "🏊", bg: "bg-blue-100" },
  { keywords: ["sport", "court", "cricket", "football"], icon: "⚽", bg: "bg-emerald-100" },
  { keywords: ["club"], icon: "🏛️", bg: "bg-slate-100" },
  { keywords: ["shop", "market", "commercial"], icon: "🛒", bg: "bg-pink-100" },
  { keywords: ["parking"], icon: "🅿️", bg: "bg-indigo-100" },
  { keywords: ["wifi", "wi-fi", "internet"], icon: "📶", bg: "bg-stone-100" },
  { keywords: ["waste", "garbage", "sanitation"], icon: "♻️", bg: "bg-purple-100" },
  { keywords: ["kid", "play", "children"], icon: "🧒", bg: "bg-amber-100" },
  { keywords: ["seat", "bench"], icon: "🪑", bg: "bg-stone-100" },
  { keywords: ["community", "hall", "banquet"], icon: "🏘️", bg: "bg-green-100" },
  { keywords: ["jog", "track", "walk"], icon: "🏃", bg: "bg-orange-100" },
  { keywords: ["temple", "mandir"], icon: "🛕", bg: "bg-amber-100" },
  { keywords: ["school", "education"], icon: "🏫", bg: "bg-blue-100" },
  { keywords: ["hospital", "medical", "clinic"], icon: "🏥", bg: "bg-red-100" },
  { keywords: ["metro", "bus", "transport", "connectivity"], icon: "🚌", bg: "bg-indigo-100" },
];

export function amenityIcon(name) {
  const key = name.trim().toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => key.includes(k))) return { icon: rule.icon, bg: rule.bg };
  }
  return { icon: "✨", bg: "bg-stone-100" };
}
