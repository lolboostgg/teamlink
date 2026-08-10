import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
// Font Awesome, cut down to the icons this codebase draws — generated at
// build time by scripts/build-icon-css.mjs, which scans src/ so the two can
// never drift. 88 KB of stylesheet for 174 icons became 28 KB.
import "./generated/fontawesome.css";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { Starfield } from "@/components/ui/Starfield";
import { cookies } from "next/headers";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n";

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

const TITLE = "QUP.gg — Ready. Queue. Play.";
const DESCRIPTION = "Book a skilled, verified teammate to play with in under two minutes.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: TITLE,
    template: "%s | QUP.gg",
  },
  description: DESCRIPTION,

  // What Discord, WhatsApp, iMessage and the rest read when the link is
  // pasted. Spelled out rather than inherited: Next fills in og:image from
  // app/opengraph-image.jpg on its own, but it does not turn `title` and
  // `description` into og:title/og:description — without these a shared link
  // unfurls as a picture with the bare domain under it.
  openGraph: {
    type: "website",
    siteName: "QUP.gg",
    title: TITLE,
    description: DESCRIPTION,
    url: siteUrl,
    locale: "en_US",
  },

  // summary_large_image is the difference between the artwork filling the
  // card and a thumbnail the size of a favicon next to the text.
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const storedLanguage = (await cookies()).get("qup:language")?.value;
  const language: LanguageCode = LANGUAGES.some((item) => item.code === storedLanguage)
    ? storedLanguage as LanguageCode
    : "en";

  return (
    <html lang={language} className={`${inter.variable} ${bebasNeue.variable}`}>
      <body>
        <Starfield />
        <AppProviders initialLanguage={language}>{children}</AppProviders>
      </body>
    </html>
  );
}
