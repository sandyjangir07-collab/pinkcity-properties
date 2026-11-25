"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { TYPE_LABEL, EMOJI } from "../lib/propertyConstants";

const MotionLink = motion(Link);

export default function PropertyCard({ p, index = 0 }) {
  const cardRef = useRef(null);
  const image = p.image_url || (p.images && p.images[0]);
  const detailUrl = `/listing/${p.id}`;
  const waHref = `https://wa.me/919358830405?text=${encodeURIComponent(`Hi, I am interested in: ${p.title} in ${p.area}`)}`;

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [5, -5]), { stiffness: 300, damping: 28 });
  const ry = useSpring(useTransform(mx, [0, 1], [-6, 6]), { stiffness: 300, damping: 28 });
  const glareX = useTransform(mx, (v) => `${v * 100}%`);
  const glareY = useTransform(my, (v) => `${v * 100}%`);

  function onMouseMove(e) {
    const rect = cardRef.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  }
  function onMouseLeave() {
    mx.set(0.5);
    my.set(0.5);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: (index % 3) * 0.08 }}
      style={{ perspective: 1000 }}
    >
      <MotionLink
        href={detailUrl}
        ref={cardRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        whileHover={{ y: -6 }}
        data-cursor="View"
        className="group relative block cursor-pointer rounded-3xl bg-white/70 border border-ink/[0.06] overflow-hidden shadow-[0_1px_2px_rgba(43,21,18,0.04)] hover:shadow-[0_28px_56px_-24px_rgba(124,46,34,0.30)] transition-shadow duration-300"
      >
        {/* Cursor-following glare — the light-catching effect that sells the 3D tilt */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: useTransform(
              [glareX, glareY],
              ([gx, gy]) => `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.35), transparent 55%)`
            ),
          }}
        />

        <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
          {image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={p.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="absolute bottom-3 right-3 w-6 h-6 object-contain opacity-40 pointer-events-none" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">{EMOJI[p.type] || "🏠"}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />

          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-[11px] font-medium text-ink/75">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
              {TYPE_LABEL[p.type] || p.type}
            </span>
            {p.verified && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-600 text-sand pl-1 pr-2.5 py-1 text-[11px] font-medium">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" className="w-3.5 h-3.5 object-contain" />
                Verified
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(waHref, "_blank", "noopener,noreferrer");
            }}
            data-cursor="Chat"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#25d366] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="WhatsApp"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413" />
            </svg>
          </button>

          <div className="absolute bottom-3 left-4 right-4 text-white">
            <div className="text-[11px] font-medium opacity-80 mb-0.5">{p.area}</div>
            <div className="font-sans font-bold text-lg leading-tight">{p.title}</div>
          </div>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="font-sans font-bold text-xl text-ink">{p.price}</div>
          <span className="text-xs font-medium text-ink/50 group-hover:text-stone-600 transition-colors inline-flex items-center gap-1">
            Details
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </MotionLink>
    </motion.div>
  );
}
