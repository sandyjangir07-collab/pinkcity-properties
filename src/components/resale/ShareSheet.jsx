import { useState } from "react";
import { Link2, Image as ImageIcon, MessageSquare, FileText, Globe, Copy } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { Sheet, SheetHeader } from "../ui/Sheet";
import { shareCard } from "../../lib/shareCard";
import { publicPlotUrl, shareText, shareOrCopy, COMPANY_NAME } from "../../lib/resale";

function Option({ Icon, title, hint, onClick, busy, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className="flex min-h-[64px] w-full items-center gap-3.5 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left transition active:scale-[0.99] disabled:opacity-45"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-50 text-stone-600"><Icon className="h-[18px] w-[18px]" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold text-ink">{busy ? "Working…" : title}</span>
        <span className="block text-[12px] text-ink/45">{hint}</span>
      </span>
    </button>
  );
}

// One place for every way to send a plot to a customer. The link carries the sender's share
// code, so the public page shows THEIR name and number, and an enquiry lands in THEIR leads.
export default function ShareSheet({ open, plot, onClose, onBrochure, onMakePublic, isAdmin }) {
  const { employee, profile } = useAuth();
  const showToast = useToast();
  const [busy, setBusy] = useState("");
  if (!plot) return <Sheet open={false} onClose={onClose} />;

  const name = employee?.full_name || profile?.full_name || "";
  const phone = employee?.mobile || "";
  const link = plot.is_public ? publicPlotUrl(plot.public_code, employee?.share_code) : "";
  const title = `${plot.scheme} — Plot ${plot.plot_number}`;

  async function sendLink() {
    const text = shareText(plot, { link, contactName: name, contactPhone: phone });
    const r = await shareOrCopy(text, title);
    if (r === "copied") showToast("✓ Copied. Paste it in WhatsApp.");
    if (r === "failed") showToast("Couldn't share. Please try again.");
    if (r !== "cancelled" && r !== "failed") onClose();
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      showToast("✓ Link copied.");
    } catch {
      showToast("Couldn't copy the link.");
    }
  }
  async function sendText() {
    const r = await shareOrCopy(shareText(plot, { contactName: name, contactPhone: phone }), title);
    if (r === "copied") showToast("✓ Details copied. Paste them in WhatsApp.");
    if (r === "failed") showToast("Couldn't share. Please try again.");
  }
  async function sendCard() {
    setBusy("card");
    try {
      const r = await shareCard(plot, { contactName: name, contactPhone: phone, link });
      if (r === "downloaded") showToast("✓ Picture saved to your phone.");
      if (r !== "cancelled") onClose();
    } catch (e) {
      showToast(e.message || "Couldn't make the picture.");
    } finally {
      setBusy("");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} maxWidth="max-w-md">
      <SheetHeader title="Share this plot" sub={title} />
      <div className="space-y-2.5">
        {plot.is_public ? (
          <>
            <Option Icon={Link2} title="Send plot link" hint={name ? `Opens a clean page with your name and number (${name})` : "Opens a clean page with the plot details and site plan"} onClick={sendLink} />
            <Option Icon={Copy} title="Copy link" hint={link.replace(/^https?:\/\//, "")} onClick={copyLink} />
          </>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
            <div className="flex items-center gap-2 font-semibold"><Globe className="h-4 w-4" /> Not on the public page yet</div>
            <p className="mt-1">{isAdmin ? "Make it public to get a shareable link and show it on the website catalogue." : "Ask your admin to make this plot public if you want to send a link. You can still send the picture, details or brochure."}</p>
            {isAdmin && onMakePublic && (
              <button onClick={onMakePublic} className="mt-2.5 min-h-[40px] rounded-full bg-amber-600 px-4 text-[12.5px] font-semibold text-white">Make public</button>
            )}
          </div>
        )}
        <Option Icon={ImageIcon} title="WhatsApp picture" hint="A ready-made image card with the key facts and your contact" onClick={sendCard} busy={busy === "card"} />
        <Option Icon={MessageSquare} title="Send details as text" hint="Plain message you can paste anywhere" onClick={sendText} />
        <Option Icon={FileText} title="Customer brochure (PDF)" hint="One branded page with the site plan" onClick={() => { onClose(); onBrochure && onBrochure(); }} />
      </div>
      <p className="mt-4 text-center text-[11px] text-ink/35">{COMPANY_NAME}</p>
    </Sheet>
  );
}
