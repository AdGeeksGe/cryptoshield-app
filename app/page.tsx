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

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
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

// A/B test — hero headline copy. The variant text comes from the Statsig
// experiment "landing_hero_headline" (string parameter "hero_headline"). Values
// use [[...]] to mark the colored accent span, mirroring the source <h1>; the
// rest of the text is HTML-escaped, then the markers become <span class="accent">.
// This keeps the headline's two-tone styling intact across every variant.
// Runs independently of the CTA test above (different element).
const HEADLINE_EXPERIMENT = "landing_hero_headline";
const HEADLINE_PARAM = "hero_headline";
const HEADLINE_DEFAULT =
  "Stop mobile scams and data hacks [[before they touch your phone.]]";

function renderHeadline(value: string): string {
  return escapeHtml(value).replace(
    /\[\[(.+?)\]\]/g,
    (_m, inner: string) => `<span class="accent">${inner}</span>`,
  );
}

function applyHeadline(html: string, value: string): string {
  if (value === HEADLINE_DEFAULT) return html;
  return html.replace(
    /(<h1 class="anim a3">)[\s\S]*?(<\/h1>)/,
    (_m, open: string, close: string) => `${open}${renderHeadline(value)}${close}`,
  );
}

// A/B test — hero visual. Control (empty src) keeps the built-in CSS/SVG phone
// mockup. The variant supplies an image URL via the Statsig experiment
// "landing_hero_visual" (string parameter "hero_image_src"); when set, the whole
// .hero-visual block is replaced with that image. The regex keeps the original
// <div class="hero-visual"> opener and the four closing tags that follow the
// block (hero-visual, hero-grid, wrap, section), swapping only the inner mockup.
const VISUAL_EXPERIMENT = "landing_hero_visual";
const VISUAL_PARAM = "hero_image_src";
const VISUAL_DEFAULT = "";

function applyHeroVisual(html: string, src: string): string {
  if (!src) return html;
  const img = `<img src="${escapeAttr(src)}" alt="" class="hero-visual-img" />`;
  return html.replace(
    /(<div class="hero-visual[^"]*"[^>]*>)[\s\S]*?(<\/div>\s*<\/div>\s*<\/div>\s*<\/section>)/,
    (_m, open: string, close: string) => `${open}${img}${close}`,
  );
}

export default async function HomePage() {
  const html = getLandingMarkup();
  const user = getStatsigUser();
  const [ctaText, headline, heroSrc] = await Promise.all([
    getExperimentParam(user, CTA_EXPERIMENT, CTA_PARAM, CTA_DEFAULT),
    getExperimentParam(user, HEADLINE_EXPERIMENT, HEADLINE_PARAM, HEADLINE_DEFAULT),
    getExperimentParam(user, VISUAL_EXPERIMENT, VISUAL_PARAM, VISUAL_DEFAULT),
  ]);

  const rendered = applyHeroVisual(
    applyHeadline(applyCtaCopy(html, ctaText), headline),
    heroSrc,
  );

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: rendered }} />
      <LandingInteractions />
      <CheckoutModal />
    </>
  );
}
