/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The home page reads content/landing.html at request time. Since enabling
  // Statsig server-side bootstrap, `/` renders on demand rather than statically,
  // so the file must be traced into the serverless function bundle explicitly —
  // its path is built at runtime and isn't auto-detected.
  experimental: {
    outputFileTracingIncludes: {
      "/": ["./content/**/*"],
    },
  },
  // Checkout now lives in an overlay popup launched from the landing-page CTAs
  // (components/CheckoutModal.tsx). The old standalone route redirects home.
  async redirects() {
    return [{ source: "/checkout", destination: "/", permanent: false }];
  },
};

export default nextConfig;
