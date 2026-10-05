import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import type { NextConfig } from "next";

const projectDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(projectDir, "../../.env"), quiet: true });

const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiInternalUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
