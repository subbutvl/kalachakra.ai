import { join } from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
  // The monorepo root, so Next.js does not guess from lockfiles elsewhere on this computer.
  outputFileTracingRoot: join(import.meta.dirname, "..", ".."),
  // The shared packages ship TypeScript source.
  transpilePackages: [
    "@kalachakra/ui",
    "@kalachakra/engine",
    "@kalachakra/rules",
    "@kalachakra/report",
  ],
  reactStrictMode: true,
  poweredByHeader: false,
  // Linting runs from the repository root (pnpm lint), with the shared ESLint config.
  eslint: { ignoreDuringBuilds: true },
  webpack(webpackConfig) {
    // Workspace packages import their own files as ".js" (TypeScript's ESM style).
    webpackConfig.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return webpackConfig;
  },
};

export default config;
