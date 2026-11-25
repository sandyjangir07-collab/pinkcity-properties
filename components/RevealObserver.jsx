"use client";

import { useEffect } from "react";

export default function RevealObserver() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-in");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    // Elements already in the DOM at mount (SSR'd content, most pages).
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));

    // Elements added later (e.g. client-side re-renders) — a lightweight
    // mutation watcher keeps new .reveal nodes from getting stuck invisible.
    const mo = new MutationObserver(() => {
      document.querySelectorAll(".reveal:not(.reveal-in)").forEach((el) => obs.observe(el));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      obs.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
