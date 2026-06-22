import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Type errors won't fail the production build
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "tokens.1inch.io" },
      { protocol: "https", hostname: "tokens.pancakeswap.finance" },
    ],
  },
  // Turbopack config (Next.js 16+) — empty = default behavior, silences the warning
  turbopack: {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any) => {
    config.cache = false;
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;
