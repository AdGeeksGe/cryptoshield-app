import Link from "next/link";

export default function CheckoutCancel() {
  return (
    <div className="co-result">
      <div className="co-result-card">
        <h1>Payment cancelled</h1>
        <p>No charge was made. You can return to the checkout whenever you’re ready.</p>
        <Link href="/checkout" className="co-submit co-result-btn">
          Back to checkout
        </Link>
      </div>
    </div>
  );
}
