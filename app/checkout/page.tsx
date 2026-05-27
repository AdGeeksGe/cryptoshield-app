import Link from "next/link";
import type { Metadata } from "next";
import CheckoutClient from "@/components/CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout · CryptoShield · CyberNoble365",
};

export default function CheckoutPage() {
  return (
    <div className="co-page">
      <header className="co-topbar">
        <Link href="/" className="co-brand">
          <span className="co-brand-mark">N</span>
          <span className="co-brand-word">
            Cyber<b>Noble</b>365
          </span>
        </Link>
        <nav className="co-topnav">
          <Link href="/">Home</Link>
          <Link href="/#protect">Mobile Security</Link>
          <Link href="/#faq">FAQ</Link>
        </nav>
      </header>

      <div className="co-banner">
        <div className="co-banner-inner">Your Account</div>
      </div>

      <main className="co-main">
        <CheckoutClient />
      </main>

      <footer className="co-footer">
        © 2026 CyberNoble365. All rights reserved.
      </footer>
    </div>
  );
}
