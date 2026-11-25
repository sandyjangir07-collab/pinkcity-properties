# PinkCity Web (Next.js)

Phase 2 of the HTML → React migration: the **public, SEO-critical site** —
separate from `pinkcity-crm` (the internal tool), because this one needs
server rendering to protect search rankings, not a client-side SPA.

## What's here (foundation + homepage)

- Next.js 14 (App Router), same design tokens as everywhere else
- `app/globals.css` — the production site's actual CSS, copied verbatim
  from `index.html`'s `<style>` block (1,456 lines) for exact visual fidelity,
  rather than hand-retyped
- Shared `Navbar` / `Footer` / `WhatsAppFab`, matching production exactly
  (scroll state, Resources dropdown, mobile menu, the "Sign In" text link)
- SEO infrastructure: `lib/seo.js` (per-page metadata builder — canonical,
  OG, Twitter card), `components/JsonLd.jsx` (RealEstateAgent schema),
  `app/sitemap.js` and `app/robots.js` matching the live ones exactly
- Homepage (`app/page.js`): real hero section, plus a **server-rendered**
  Featured Properties grid pulling live data from Supabase (`revalidate =
  300`, so it refreshes every 5 minutes without a full redeploy)

## Not built yet

Every other public page: `/areas`, `/founders`, `/govt-resources`, the 4
location pages, `/calculator`, `/why`, `/verified`, `/investment`,
`/reviews`, `/blog` (+ individual posts), and `/listing/[id]` (individual
property detail pages). Same step-by-step approach as the CRM build —
one page at a time, each grounded in the actual production HTML rather than
guessed at.

## Setup

```bash
npm install
npm run dev
```

`.env.local` already has the Supabase URL and anon key.

## Deploy

New GitHub repo + new Vercel project — don't reuse `pinkcity-crm` or
`pinkcity-properties`, this is a genuinely separate app:

```bash
git init
git add .
git commit -m "Foundation + homepage"
git branch -M main
git remote add origin https://github.com/sandyjangir07-collab/pinkcity-web.git
git push -u origin main
```

Then import that repo as a new project in Vercel (Next.js is
auto-detected, no config needed) and add the same two environment
variables from `.env.local` in the project's Settings → Environment
Variables (Next.js doesn't read committed `.env.local` files the way Vite
does — these need to be set in Vercel's dashboard directly).

**Do not point `pinkcityproperties.com` at this until it covers the whole
site** — right now it's only the homepage; swapping the domain over early
would take down every other page.
