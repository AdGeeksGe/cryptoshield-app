import fs from "node:fs";
import path from "node:path";
import LandingInteractions from "@/components/LandingInteractions";

// The marketing landing page is rendered from the original hand-authored
// markup so the design stays pixel-identical to the source. It is trusted,
// static, first-party content (no user input), so dangerouslySetInnerHTML is
// safe here. Interactive behaviour lives in <LandingInteractions />.
function getLandingMarkup() {
  const file = path.join(process.cwd(), "content", "landing.html");
  return fs.readFileSync(file, "utf8");
}

export default function HomePage() {
  const html = getLandingMarkup();
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <LandingInteractions />
    </>
  );
}
