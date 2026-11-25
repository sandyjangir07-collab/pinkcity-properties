import "./globals.css";
import JsonLd from "../components/JsonLd";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import WhatsAppFab from "../components/WhatsAppFab";
import SmoothScroll from "../components/SmoothScroll";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";
import { buildMetadata } from "../lib/seo";

export const metadata = {
  ...buildMetadata({
    title: "PinkCity — Buy Verified Property in Jaipur | Plots, Flats & Villas",
    description:
      "Discover legally verified homes, plots and colonies in Jaipur with PinkCity. End-to-end support for loans, legal checks, documentation and registration.",
    path: "/",
  }),
  metadataBase: new URL("https://pinkcityproperties.com"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PinkCity",
  },
  icons: {
    icon: [
      { url: "/icon-512-v3.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-192-v3.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-72-v3.png", sizes: "72x72", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon-v3.png" },
    ],
  },
};

export const viewport = {
  themeColor: "#C43868",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..700,30&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <JsonLd />
      </head>
      <body>
        <SmoothScroll>
          <Navbar />
          {children}
          <Footer />
        </SmoothScroll>
        <WhatsAppFab />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
