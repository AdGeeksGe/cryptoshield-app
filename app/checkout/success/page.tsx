import Link from "next/link";

export default function CheckoutSuccess() {
  return (
    <div className="co-result">
      <div className="co-result-card">
        <h1>Thank you — your payment is being confirmed.</h1>
        <p>
          We’ve received your order. You’ll get an email from CyberNoble365 with
          your CryptoShield setup link as soon as payment is confirmed by the
          gateway.
        </p>
        <Link href="/" className="co-submit co-result-btn">
          Back to home
        </Link>
      </div>
    </div>
  );
}
