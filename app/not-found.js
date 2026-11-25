import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center pt-16 px-6">
      <div className="text-center max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="w-16 h-16 object-contain mx-auto mb-6 opacity-70" />
        <div className="font-display text-5xl text-ink mb-3">404</div>
        <h1 className="font-display text-2xl text-ink mb-3">Page not found</h1>
        <p className="text-sm text-ink/50 mb-8 leading-relaxed">
          This page may have moved, or the link might be outdated. Let&apos;s get you back to somewhere useful.
        </p>
        <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-stone-600 text-sand text-sm font-medium px-6 py-3">
          Back to homepage
        </Link>
      </div>
    </div>
  );
}
