import { buildMetadata } from "../../lib/seo";
import PolicyPlaceholder from "../../components/PolicyPlaceholder";

export const metadata = buildMetadata({
  title: "Terms of Service — PinkCity",
  description: "PinkCity Properties' terms of service.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <PolicyPlaceholder
      eyebrow="Legal"
      title="Terms of Service"
      body="Our full terms of service are being finalized. In the meantime, if you have any questions about using this site or working with PinkCity, please reach out directly and we'll answer promptly."
    />
  );
}
