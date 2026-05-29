import type { Metadata } from "next";
import "./globals.css";
import MyStatsig from "./my-statsig";
import {
  STATSIG_CLIENT_KEY,
  getStatsigBootstrap,
  getStatsigUser,
} from "@/lib/statsig";

export const metadata: Metadata = {
  title:
    "CryptoShield Mobile Security — Quiet Protection for Your Whole Family · CyberNoble365",
  description:
    "CryptoShield protects your phone from scams, phishing, fake Wi-Fi, and account theft — with friendly support that stays with you until it’s sorted. From the team at CyberNoble365.",
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
