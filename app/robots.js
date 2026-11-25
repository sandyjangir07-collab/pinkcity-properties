export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard.html", "/login.html"],
    },
    sitemap: "https://pinkcityproperties.com/sitemap.xml",
  };
}
