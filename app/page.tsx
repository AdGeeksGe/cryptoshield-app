import fs from "node:fs";
import path from "node:path";
import LandingInteractions from "@/components/LandingInteractions";
import CheckoutModal from "@/components/CheckoutModal";
import { getExperimentParam, getStatsigUser } from "@/lib/statsig";

// The marketing landing page is rendered from the original hand-authored
// markup so the design stays pixel-identical to the source. It is trusted,
// static, first-party content (no user input), so dangerouslySetInnerHTML is
// safe here. Interactive behaviour lives in <LandingInteractions />.
function getLandingMarkup() {
  const file = path.join(process.cwd(), "content", "landing.html");
  return fs.readFileSync(file, "utf8");
}

// A/B test — primary call-to-action copy across the whole landing page. The
// variant text comes from the Statsig experiment "landing_hero_cta" (string
// parameter "hero_cta_text"); the control group keeps the original wording.
// Every primary CTA shares the same copy (header, mobile menu, hero, mid-page,
// and footer band), so the swap targets each `btn btn-primary` anchor that
// currently holds the control text — keeping all CTAs consistent within a
// group. Rendered server-side, so there is no variant flicker on first paint.
const CTA_EXPERIMENT = "landing_hero_cta";
const CTA_PARAM = "hero_cta_text";
const CTA_DEFAULT = "Secure Your Phone Now →";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyCtaCopy(html: string, text: string): string {
  if (text === CTA_DEFAULT) return html;
  // Replace the inner text of every primary CTA anchor that holds the control
  // copy. Scoping to `btn-primary` + the exact control text avoids touching any
  // unrelated text and is robust to per-anchor attribute differences
  // (e.g. href="/checkout" vs "#diagnose", the data-close flag).
  const re = new RegExp(
    `(<a\\b[^>]*class="[^"]*\\bbtn-primary\\b[^"]*"[^>]*>)${escapeRegExp(CTA_DEFAULT)}(</a>)`,
    "g",
  );
  return html.replace(re, (_m, open: string, close: string) => `${open}${escapeHtml(text)}${close}`);
}

export default async function HomePage() {
  const html = getLandingMarkup();
  const ctaText = await getExperimentParam(
    getStatsigUser(),
    CTA_EXPERIMENT,
    CTA_PARAM,
    CTA_DEFAULT,
  );

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: applyCtaCopy(html, ctaText) }} />
      <LandingInteractions />
      <CheckoutModal />
    </>
  );
}
