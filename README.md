# PinkCity CRM (React/Vite)

Step one of the HTML → React migration: the Employee Management Module, reconstructed
to match the live `employees.html` feature-for-feature, **plus** the Plots & Token
Submission/Review workflow that wasn't ported yet.

This was rebuilt from scratch against the actual Supabase schema, RLS policies and
RPC definitions (not guessed), and the Plots/Token modals were ported line-for-line
from the production logic in `listing.html`, so the UI language, validation, and
approve/reject behavior should match exactly.

## What's here

- **Auth** — Google OAuth + email/password, matching `login.html`. Auto-links an
  employee record created by an admin to your account the first time you log in
  with that email.
- **Team Directory** (admin) — hierarchy-nested list, stat cards (Members, Fully
  Verified, Total Sales), add team member.
- **Self-signup** — `Create Your Profile` → `pending_review` → admin approval queue.
- **Employee Profile** — Identity (photo upload), Commission (₹/Gaj rate, slab
  history, deal-based totals), Compliance (Aadhaar/PAN/Police Verification upload +
  admin review), Personal Info, Employment, Hierarchy (request/approve), Activity.
- **Plots & Tokens** *(new)* — pick a project, see the plot grid (green/yellow/red),
  tap a green plot to submit a token (client + associate name + payment
  screenshot), admin taps a yellow plot to review it (approve with sale amount +
  credited associate, or reject with a reason). Approving flips the plot to Sold
  and feeds the employee's commission totals.
- **Admin: Pending Approvals** — profile approvals + hierarchy requests in one queue.
- **Admin: Commission Slabs** — create/deactivate ₹-per-Gaj slabs.

## Not carried over yet

- Employee-specific push notifications (`employee_notifications` table + `send-push`
  wiring) — still only exists in the HTML CRM.
- Document-expiry reminder cron.

## Setup

```bash
npm install
npm run dev
```

`.env` already has the project's Supabase URL and anon key (the anon key is safe to
ship client-side — every table is RLS-protected). Copy `.env.example` instead if you
ever need to point this at a different Supabase project.

## Getting this into GitHub + Vercel (so it doesn't happen again)

```bash
git init
git add .
git commit -m "Reconstruct Employee Management Module + Plots/Token workflow"
git branch -M main
git remote add origin https://github.com/sandyjangir07-collab/pinkcity-crm.git
git push -u origin main
```

Then in the Vercel dashboard: `pinkcity-crm` project → Settings → Git → Connect Git
Repository → pick this repo → confirm `main` as the Production branch. Every push
will auto-deploy from then on.

## Build

```bash
npm run build
```

Outputs to `dist/`. `vercel.json` isn't needed — Vite's default build output works
with Vercel's auto-detected framework preset.
