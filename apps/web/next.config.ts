import type { NextConfig } from "next";

const config: NextConfig = {
  // @repo/shared ships raw TypeScript and has no build step, so Next has to
  // compile it exactly as it compiles this app's own source. Without this, the
  // import resolves to .ts that webpack/turbopack refuses to parse.
  transpilePackages: ["@repo/shared"],
};

export default config;
