"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((reg) => {
        reg.update().catch(() => {});
      }).catch(() => {});
    }
  }, []);
  return null;
}
