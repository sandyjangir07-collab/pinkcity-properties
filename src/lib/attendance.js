export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
export function fmtTime(iso) {
  return iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "";
}
export function fmtHours(inIso, outIso) {
  if (!inIso || !outIso) return "";
  const ms = new Date(outIso) - new Date(inIso);
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}
export function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location services are not available on this device or browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => reject(new Error("Could not get your location. Please enable location access and try again.")),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}
