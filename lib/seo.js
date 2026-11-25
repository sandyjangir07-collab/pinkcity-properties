const SITE_URL = "https://pinkcityproperties.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/icon-512.png`;

// Every page calls this to build its metadata export, so the tag pattern
// (canonical, OG, twitter card) stays identical to what's already indexed —
// only title/description/path change per page.
export function buildMetadata({ title, description, path = "/", ogImage = DEFAULT_OG_IMAGE }) {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      url,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export { SITE_URL };
