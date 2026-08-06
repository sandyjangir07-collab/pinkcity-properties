import {
  Users, Calendar, Phone, Home as HomeIcon, Ticket, CalendarClock, Clock,
  FileText, TrendingUp, Newspaper, CheckCircle, BadgeIndianRupee,
} from "lucide-react";

export const NAV_LINKS = [
  { to: "/team", label: "Team", Icon: Users, accent: "stone" },
  { to: "/today", label: "Today", Icon: Calendar, accent: "stone" },
  { to: "/attendance", label: "Attendance", Icon: Clock, accent: "stone" },
  { to: "/leads", label: "Leads", Icon: Phone, accent: "jali" },
  { to: "/listings", label: "Listings", Icon: HomeIcon, accent: "jali" },
  { to: "/plots", label: "Plots & Tokens", Icon: Ticket, accent: "jali" },
  { to: "/schedule", label: "Schedule", Icon: CalendarClock, accent: "jali" },
  { to: "/quotation", label: "Quotation", Icon: FileText, accent: "brass" },
  { to: "/commission-slabs", label: "Commission Slabs", Icon: BadgeIndianRupee, accent: "brass", adminOnly: true },
  { to: "/performance", label: "Performance", Icon: TrendingUp, accent: "brass", adminOnly: true },
  { to: "/blogs", label: "Blogs", Icon: Newspaper, accent: "stone", adminOnly: true },
  { to: "/approvals", label: "Approvals", Icon: CheckCircle, accent: "jali", adminOnly: true },
];

export const NAV_ACCENT = {
  stone: { bg: "bg-stone-600", soft: "bg-stone-50", text: "text-stone-600", ring: "border-stone-600" },
  jali: { bg: "bg-jali", soft: "bg-jali-50", text: "text-jali", ring: "border-jali" },
  brass: { bg: "bg-brass", soft: "bg-brass/10", text: "text-brass", ring: "border-brass" },
};
