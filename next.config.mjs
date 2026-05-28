/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Checkout now lives in an overlay popup launched from the landing-page CTAs
  // (components/CheckoutModal.tsx). The old standalone route redirects home.
  async redirects() {
    return [{ source: "/checkout", destination: "/", permanent: false }];
  },
};

export default nextConfig;
