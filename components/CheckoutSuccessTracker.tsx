"use client";

import { useEffect, useRef } from "react";
import { useStatsigClient } from "@statsig/react-bindings";

// Fires the checkout conversion once when the gateway redirects the buyer to
// the success page. This is the browser-side signal; for fully gateway-verified
// attribution, also call logStatsigEvent("checkout_purchase_confirmed", ...)
// from the payment webhook once the statsig_id is threaded through the session.
export default function CheckoutSuccessTracker() {
  const { logEvent } = useStatsigClient();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    logEvent("checkout_purchase_success");
  }, [logEvent]);

  return null;
}
