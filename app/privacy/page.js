import { buildMetadata } from "../../lib/seo";
import PolicyPlaceholder from "../../components/PolicyPlaceholder";

export const metadata = buildMetadata({
  title: "Privacy Policy — PinkCity",
  description: "PinkCity Properties' privacy policy.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <PolicyPlaceholder
      eyebrow="Legal"
      title="Privacy Policy"
      body="Our full privacy policy is being finalized. In the meantime, if you have any questions about how we handle your personal information, please reach out directly and we'll answer promptly."
    />
  );
}
