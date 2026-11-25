import { buildMetadata } from "../../lib/seo";
import FoundersView from "./FoundersView";

export const metadata = buildMetadata({
  title: "Our Story — Founders | PinkCity Properties",
  description: "PinkCity Properties was built on three simple principles: clarity over confusion, trust over transactions, long-term value over quick sales.",
  path: "/founders",
});

export default function FoundersPage() {
  return <FoundersView />;
}
