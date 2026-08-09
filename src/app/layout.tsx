import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { Starfield } from "@/components/ui/Starfield";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

// Bold condensed display face for headlines only (hero titles, section
// titles, stat values) — the punchy all-caps look most gaming platforms
// (tapin.gg included) use to separate "shout" typography from body copy.
// Body text stays on Inter throughout.
const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

// The name is settled (QUP.gg) but this still points at the host the site
// actually answers on. Every relative OG/Twitter image is resolved against it,
// so it has to be a domain that is really serving — pointing it at one whose
// DNS hasn't landed yet doesn't fail loudly, it just makes every link preview
// come up blank. Set APP_URL, or swap the literal, the day qup.gg is live.
const siteUrl = process.env.APP_URL ?? process.env.AUTH_URL ?? "https://gaming.lolboost.gg";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "QUP.gg — Ready. Queue. Play.",
    template: "%s | QUP.gg",
  },
  description: "Book a skilled, verified teammate to play with in under two minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${bebasNeue.variable}`}>
      <body>
        <Starfield />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
