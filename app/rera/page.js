import { buildMetadata } from "../../lib/seo";
import PolicyPlaceholder from "../../components/PolicyPlaceholder";

export const metadata = buildMetadata({
  title: "RERA Registration — PinkCity",
  description: "PinkCity Properties' RERA registration details.",
  path: "/rera",
});

export default function ReraPage() {
  return (
    <PolicyPlaceholder
      eyebrow="Legal"
      title="RERA Registration"
      body="Our RERA registration details are being added here. In the meantime, please contact us directly for our registration number and any project-specific RERA information you need."
    />
  );
}
