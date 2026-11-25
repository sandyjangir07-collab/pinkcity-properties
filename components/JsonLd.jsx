export default function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: "PinkCity Properties",
    alternateName: "PinkCity",
    url: "https://pinkcityproperties.com",
    logo: "https://pinkcityproperties.com/logo.png",
    image: "https://pinkcityproperties.com/icon-512-v3.png",
    description: "Verified real estate listings, transparent deals, and end-to-end buying support in Jaipur, Rajasthan.",
    telephone: "+91-9358830405",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Jaipur",
      addressRegion: "Rajasthan",
      addressCountry: "IN",
    },
    areaServed: { "@type": "City", name: "Jaipur" },
    priceRange: "₹₹",
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
