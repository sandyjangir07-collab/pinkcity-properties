"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { CRM_LOGIN_URL } from "../lib/config";
import Magnetic from "./Magnetic";

const RESOURCE_LINKS = [
  { href: "/why", label: "Why PinkCity" },
  { href: "/verified", label: "Verified™" },
  { href: "/investment", label: "Investment Guide" },
  { href: "/blog", label: "Blog" },
  { href: "/reviews", label: "Reviews" },
  { href: "/govt-resources", label: "Govt. Resources" },
];
const MAIN_LINKS = [
  { href: "/areas", label: "Explore Areas" },
  { href: "/resale", label: "Resale Plots" },
  { href: "/calculator", label: "Calculator" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-500",
        scrolled ? "bg-sand/90 backdrop-blur-md border-b border-ink/[0.06] py-3" : "bg-transparent py-6"
      )}
    >
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group" data-cursor="Home">
          <span className="w-9 h-9 rounded-full bg-stone-600 flex items-center justify-center shadow-[0_4px_14px_-6px_rgba(196,56,104,0.5)] p-[5px] shrink-0 transition-transform group-hover:scale-105">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="w-full h-full object-contain" />
          </span>
          <span className="font-display text-xl text-ink">
            PinkCity<span className="text-stone-500">.</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
          {MAIN_LINKS.map((l) => (
            <NavLink key={l.href} href={l.href} hovered={hovered} setHovered={setHovered}>
              {l.label}
            </NavLink>
          ))}
          <ResourcesDropdown hovered={hovered} setHovered={setHovered} />
          <NavLink href="/founders" hovered={hovered} setHovered={setHovered}>
            About
          </NavLink>
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <a href={CRM_LOGIN_URL} data-cursor="Sign In" className="text-sm text-ink/60 hover:text-ink transition-colors px-3">
            Sign In
          </a>
          <Magnetic strength={0.3}>
            <a
              href={CRM_LOGIN_URL}
              data-cursor="Go"
              className="inline-flex items-center gap-2 rounded-full bg-stone-600 text-sand text-sm font-medium px-5 py-2.5 hover:bg-stone-700 transition-colors"
            >
              List Property
            </a>
          </Magnetic>
        </div>

        <button
          className="lg:hidden w-10 h-10 flex items-center justify-center text-ink"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden overflow-hidden bg-sand border-t border-ink/[0.06]"
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {[...MAIN_LINKS, ...RESOURCE_LINKS, { href: "/founders", label: "About" }].map((l) => (
                <Link key={l.href} href={l.href} className="py-2.5 text-ink/80 text-sm" onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              ))}
              <a href={CRM_LOGIN_URL} className="py-2.5 text-ink/80 text-sm" onClick={() => setOpen(false)}>
                Sign In
              </a>
              <a
                href={CRM_LOGIN_URL}
                className="mt-2 text-center rounded-full bg-stone-600 text-sand text-sm font-medium py-3"
                onClick={() => setOpen(false)}
              >
                List Property
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function NavLink({ href, children, hovered, setHovered }) {
  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(href)}
      className="relative text-sm text-ink/70 hover:text-ink transition-colors px-4 py-2 rounded-full"
    >
      {hovered === href && (
        <motion.span layoutId="navHoverPill" className="absolute inset-0 bg-ink/[0.05] rounded-full" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
      )}
      <span className="relative">{children}</span>
    </Link>
  );
}

function ResourcesDropdown({ hovered, setHovered }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => { setOpen(true); setHovered("resources"); }} onMouseLeave={() => setOpen(false)}>
      <button className="relative text-sm text-ink/70 hover:text-ink transition-colors px-4 py-2 rounded-full inline-flex items-center gap-1">
        {hovered === "resources" && (
          <motion.span layoutId="navHoverPill" className="absolute inset-0 bg-ink/[0.05] rounded-full" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
        )}
        <span className="relative">Resources</span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="relative">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16 }}
            className="absolute top-full left-0 pt-2 w-52"
          >
            <div className="bg-sand border border-ink/10 rounded-2xl shadow-xl p-2">
              {RESOURCE_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="block px-4 py-2.5 text-sm text-ink/75 hover:text-ink hover:bg-ink/[0.04] rounded-xl transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
