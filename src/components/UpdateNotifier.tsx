"use client";

import { useEffect } from "react";

export default function UpdateNotifier() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        // New service worker took over — reload to get fresh content
        window.location.reload();
      });

      // Check for SW update every 30s
      const interval = setInterval(() => {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) reg.update();
        });
      }, 30000);

      return () => clearInterval(interval);
    }
  }, []);

  return null;
}
