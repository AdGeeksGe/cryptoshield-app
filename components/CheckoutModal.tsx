"use client";

import { useEffect, useState } from "react";
import CheckoutClient from "@/components/CheckoutClient";

// Renders the checkout as an overlay popup instead of a standalone page, and
// wires every landing-page CTA to open it. CTAs live inside server-rendered,
// dangerouslySetInnerHTML markup, so clicks are caught via document-level
// delegation rather than per-element listeners.
export default function CheckoutModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      const label = (anchor.textContent ?? "").toLowerCase();
      if (href === "/checkout" || label.includes("secure your phone now")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="co-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="co-modal" role="dialog" aria-modal="true" aria-label="Checkout">
        <div className="co-modal-head">
          <span className="co-brand-word">
            Cyber<b>Noble</b>365 · Checkout
          </span>
          <button
            type="button"
            className="co-modal-close"
            onClick={() => setOpen(false)}
            aria-label="Close checkout"
          >
            ×
          </button>
        </div>
        <div className="co-modal-body">
          <CheckoutClient />
        </div>
      </div>
    </div>
  );
}
