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

// A/B test — hero call-to-action copy. The variant text comes from the Statsig
// experiment "landing_hero_cta" (string parameter "hero_cta_text"); the control
// group keeps the original wording. The swap is scoped to the hero CTA alone:
// the same copy also appears in the header, mobile menu, and a mid-page block,
// which this regex deliberately leaves untouched so the experiment isolates the
// hero. Rendered server-side, so there is no variant flicker on first paint.
const HERO_CTA_EXPERIMENT = "landing_hero_cta";
const HERO_CTA_PARAM = "hero_cta_text";
const HERO_CTA_DEFAULT = "Secure Your Phone Now →";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function applyHeroCta(html: string, text: string): string {
  if (text === HERO_CTA_DEFAULT) return html;
  return html.replace(
    /(<div class="hero-cta-row[^"]*">\s*<a href="#diagnose" class="btn btn-primary">)[^<]*(<\/a>)/,
    (_m, open: string, close: string) => `${open}${escapeHtml(text)}${close}`,
  );
}

export default async function HomePage() {
  const html = getLandingMarkup();
  const ctaText = await getExperimentParam(
    getStatsigUser(),
    HERO_CTA_EXPERIMENT,
    HERO_CTA_PARAM,
    HERO_CTA_DEFAULT,
  );

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: applyHeroCta(html, ctaText) }} />
      <LandingInteractions />
      <CheckoutModal />
    </>
  );
}
