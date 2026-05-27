"use client";

import { useEffect } from "react";

// Re-implements the original landing page's vanilla-JS behaviour as a
// client-side effect that runs against the server-rendered markup:
// sticky header, mobile menu, optional pricing toggle, FAQ accordion,
// scroll-reveal, and a no-redirect handler for the free health-check form.
export default function LandingInteractions() {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    /* ---------- Sticky header state ---------- */
    const header = document.getElementById("header");
    if (header) {
      const onScroll = () =>
        header.classList.toggle("scrolled", window.scrollY > 24);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => window.removeEventListener("scroll", onScroll));
    }

    /* ---------- Mobile menu ---------- */
    const panel = document.getElementById("mobilePanel");
    const menuOpen = document.getElementById("menuOpen");
    const menuClose = document.getElementById("menuClose");
    if (panel) {
      const openMenu = () => {
        panel.classList.add("open");
        panel.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      };
      const closeMenu = () => {
        panel.classList.remove("open");
        panel.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      };
      menuOpen?.addEventListener("click", openMenu);
      menuClose?.addEventListener("click", closeMenu);
      const closers = Array.from(panel.querySelectorAll("[data-close]"));
      closers.forEach((a) => a.addEventListener("click", closeMenu));
      cleanups.push(() => {
        menuOpen?.removeEventListener("click", openMenu);
        menuClose?.removeEventListener("click", closeMenu);
        closers.forEach((a) => a.removeEventListener("click", closeMenu));
      });
    }

    /* ---------- Pricing toggle (only if markup present) ---------- */
    const sw = document.getElementById("billSwitch");
    const lblM = document.getElementById("lblMonthly");
    const lblY = document.getElementById("lblYearly");
    if (sw && lblM && lblY) {
      document.querySelectorAll(".plan .price").forEach((price) => {
        const was = document.createElement("div");
        was.className = "price-was";
        price.parentNode?.insertBefore(was, price);
      });
      const setBilling = (yearly: boolean) => {
        sw.setAttribute("aria-checked", String(yearly));
        lblM.classList.toggle("active", !yearly);
        lblY.classList.toggle("active", yearly);
        document.querySelectorAll(".plan").forEach((plan) => {
          const amt = plan.querySelector<HTMLElement>(".amt");
          const was = plan.querySelector(".price-was");
          const note = plan.querySelector("[data-note]");
          if (amt) amt.textContent = yearly ? amt.dataset.y! : amt.dataset.m!;
          if (was)
            was.innerHTML =
              yearly && amt && amt.dataset.m !== "0"
                ? "Normally <s>$" + amt.dataset.m + "</s>/mo"
                : "";
          if (note)
            note.textContent = yearly
              ? "per month, billed annually"
              : "Billed monthly";
        });
      };
      const onToggle = () =>
        setBilling(sw.getAttribute("aria-checked") !== "true");
      sw.addEventListener("click", onToggle);
      cleanups.push(() => sw.removeEventListener("click", onToggle));
    }

    /* ---------- FAQ accordion ---------- */
    const faqItems = Array.from(document.querySelectorAll<HTMLElement>(".qa"));
    const faqHandlers: Array<{ btn: Element; fn: () => void }> = [];
    faqItems.forEach((item) => {
      const btn = item.querySelector("button");
      const ans = item.querySelector<HTMLElement>(".a");
      if (!btn || !ans) return;
      const fn = () => {
        const open = item.getAttribute("aria-expanded") === "true";
        document.querySelectorAll('.qa[aria-expanded="true"]').forEach((o) => {
          if (o !== item) {
            o.setAttribute("aria-expanded", "false");
            const a = o.querySelector<HTMLElement>(".a");
            if (a) a.style.maxHeight = "";
          }
        });
        item.setAttribute("aria-expanded", String(!open));
        ans.style.maxHeight = open ? "" : ans.scrollHeight + "px";
      };
      btn.addEventListener("click", fn);
      faqHandlers.push({ btn, fn });
    });
    cleanups.push(() =>
      faqHandlers.forEach(({ btn, fn }) => btn.removeEventListener("click", fn)),
    );

    /* ---------- Scroll reveal ---------- */
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            if (e.target.hasAttribute("data-stagger")) {
              Array.from(e.target.children).forEach((c, idx) => {
                (c as HTMLElement).style.transitionDelay = idx * 70 + "ms";
              });
            }
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());

    /* ---------- Free health-check form (no page reload) ---------- */
    const form = document.querySelector<HTMLFormElement>(".diag-form");
    if (form) {
      const onSubmit = (ev: Event) => {
        ev.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        form.innerHTML =
          '<div class="diag-form-h">Thanks — your request is in.</div>' +
          '<p style="color:var(--peri);margin-top:8px">A CyberNoble365 specialist will email your free health check shortly.</p>';
      };
      form.addEventListener("submit", onSubmit);
      cleanups.push(() => form.removeEventListener("submit", onSubmit));
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
