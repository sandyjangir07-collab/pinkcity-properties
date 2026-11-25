"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useScroll } from "framer-motion";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import JaliPattern from "./JaliPattern";
import JaliMedallion from "./JaliMedallion";
import { Button } from "./ui/button";
import Magnetic from "./Magnetic";
import SearchCard from "./SearchCard";

const EASE = [0.22, 1, 0.36, 1];
const MEDALLION_COUNT = 9;
const HEADLINE_LINES = [
  [{ t: "Find your" }],
  [{ t: "perfect ", em: true }, { t: "property." }],
];

export default function Hero({ listingCount, filters, onFilterChange, onSearch }) {
  const screenRef = useRef(null);
  const sectionRef = useRef(null);

  // Cursor-driven parallax on the background layers
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 60, damping: 20 });
  const smy = useSpring(my, { stiffness: 60, damping: 20 });
  const orb1X = useTransform(smx, (v) => v * -22);
  const orb1Y = useTransform(smy, (v) => v * -22);
  const orb2X = useTransform(smx, (v) => v * 16);
  const orb2Y = useTransform(smy, (v) => v * 16);
  const jaliX = useTransform(smx, (v) => v * -8);
  const jaliY = useTransform(smy, (v) => v * -8);

  // Scroll-linked parallax fade on the hero content itself
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    function onMove(e) {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      mx.set(nx);
      my.set(ny);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);

    const cells = screenRef.current?.querySelectorAll("[data-cell]");
    if (!cells?.length) return;

    const ctx = gsap.context(() => {
      gsap.set(cells, { opacity: 0, scale: 0.4, rotate: -8 });
      gsap.to(cells, {
        opacity: 1,
        scale: 1,
        rotate: 0,
        duration: 0.6,
        ease: "back.out(1.7)",
        stagger: 0.06,
        scrollTrigger: {
          trigger: screenRef.current,
          start: "top 85%",
        },
      });
    }, screenRef);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <section ref={sectionRef} className="relative min-h-[92vh] flex items-center overflow-hidden grain">
        <motion.div style={{ x: jaliX, y: jaliY }} className="absolute inset-0 opacity-[0.06] text-stone-600">
          <JaliPattern id="hero-jali" />
        </motion.div>
        <motion.div style={{ x: orb1X, y: orb1Y }} className="absolute -top-40 -right-40 w-[560px] h-[560px] rounded-full bg-gradient-to-br from-stone-400/[0.16] via-stone-500/[0.10] to-transparent blur-3xl" />
        <motion.div style={{ x: orb2X, y: orb2Y }} className="absolute bottom-0 -left-32 w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-jali/[0.14] via-brass/[0.08] to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_40%,#F7F0E4_100%)] pointer-events-none opacity-40" />

        <motion.div style={{ y: contentY, opacity: contentOpacity }} className="relative mx-auto max-w-7xl px-6 pt-28 pb-16 w-full">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="inline-flex items-center gap-2 rounded-full border border-stone-500/25 bg-stone-50 px-4 py-1.5 text-xs font-medium tracking-wide text-stone-600 mb-8"
            >
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-stone-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              Verified Properties · Transparent Deals
            </motion.div>

            <h1 className="font-display text-[10vw] leading-[1.08] sm:text-5xl md:text-6xl text-ink mb-6">
              {HEADLINE_LINES.map((line, li) => (
                <span key={li} className="block overflow-hidden pt-2 pb-2 -my-2">
                  <motion.span
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 0.85, ease: EASE, delay: 0.15 + li * 0.1 }}
                    className="block"
                  >
                    {line.map((seg, si) => (
                      <span key={si} className={seg.em ? "italic text-stone-600" : undefined}>
                        {seg.t}
                      </span>
                    ))}
                  </motion.span>
                </span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.45 }}
              className="text-lg text-ink/55 max-w-md mb-10 leading-relaxed"
            >
              Legally verified homes, plots and colonies in Jaipur — with end-to-end support for loans, documentation and registration.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.55 }}
              className="mb-10"
            >
              <Magnetic strength={0.4}>
                <Button as="a" href="#properties" size="lg" data-cursor="View">
                  Explore properties
                  <motion.svg
                    width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    initial={{ x: 0 }}
                    whileHover={{ x: 3 }}
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </motion.svg>
                </Button>
              </Magnetic>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.75 }}
            className="max-w-3xl"
          >
            <SearchCard filters={filters} onChange={onFilterChange} onSearch={onSearch} />
          </motion.div>
        </motion.div>
      </section>

      {/* Screen-reveal divider — the jali "unlocking" as you scroll toward the listings */}
      <div ref={screenRef} className="relative py-10 sm:py-14 bg-sand-deep/40 overflow-hidden">
        <div className="mx-auto max-w-4xl px-6 flex items-center justify-center gap-2 sm:gap-5">
          {Array.from({ length: MEDALLION_COUNT }).map((_, i) => (
            <JaliMedallion
              key={i}
              data-cell
              className="w-6 sm:w-9 shrink-0"
              color={i === Math.floor(MEDALLION_COUNT / 2) ? "#B98A3E" : "#C43868"}
            />
          ))}
        </div>
      </div>
    </>
  );
}
