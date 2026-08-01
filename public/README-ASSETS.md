This folder needs 3 files copied over from the live site's root before the
Quotation PDF export will work (they're referenced by exact filename at
runtime, and I don't have their actual bytes to generate here):

- logo.png              — the round PinkCity logo mark used on the PDF header
- NotoSans-Regular.ttf  — has a ₹ glyph; jsPDF's built-in fonts don't
- NotoSans-Bold.ttf     — same, bold weight

Grab them from your production site (e.g. https://www.pinkcityproperties.com/logo.png,
.../NotoSans-Regular.ttf, .../NotoSans-Bold.ttf) and drop them in this folder.
Vite serves everything in `public/` from the site root automatically, so no
config changes needed — just delete this README once the 3 files are in place.
