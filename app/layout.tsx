import type { Metadata, Viewport } from "next";
import "./globals.css";
import MyStatsig from "./my-statsig";
import {
  STATSIG_CLIENT_KEY,
  getStatsigBootstrap,
  getStatsigUser,
} from "@/lib/statsig";

const SITE_NAME = "CryptoShield";
const SITE_TITLE =
  "CryptoShield Mobile Security — Quiet Protection for Your Whole Family · CyberNoble365";
const SITE_DESCRIPTION =
  "CryptoShield protects your phone from scams, phishing, fake Wi-Fi, and account theft — with friendly support that stays with you until it’s sorted. From the team at CyberNoble365.";

export const metadata: Metadata = {
  metadataBase: new URL("https://cryptoshield.app"),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "CryptoShield",
    "mobile security",
    "scam protection",
    "phishing protection",
    "phone security",
    "family online safety",
    "CyberNoble365",
  ],
  authors: [{ name: "CyberNoble365" }],
  creator: "CyberNoble365",
  publisher: "CyberNoble365",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#070b22",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = getStatsigUser();
  const bootstrapValues = await getStatsigBootstrap(user);

  const tree =
    STATSIG_CLIENT_KEY ? (
      <MyStatsig
        userID={user.userID ?? "anonymous"}
        bootstrapValues={bootstrapValues}
      >
        {children}
      </MyStatsig>
    ) : (
      children
    );

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Lora:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{tree}</body>
    </html>
  );
}
