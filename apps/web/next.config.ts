import type { NextConfig } from "next";

const config: NextConfig = {
  // @repo/shared ships raw TypeScript and has no build step, so Next has to
  // compile it exactly as it compiles this app's own source. Without this, the
  // import resolves to .ts that webpack/turbopack refuses to parse.
  transpilePackages: ["@repo/shared"],
  images: {
    // Product photos are resolved once at seed time from Pexels; see apps/api/src/seed.ts.
    remotePatterns: [{ protocol: "https", hostname: "images.pexels.com", pathname: "/**" }],
    formats: ["image/avif", "image/webp"],
  },
};

export default config;
