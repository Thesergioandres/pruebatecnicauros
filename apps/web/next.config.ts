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
  // TypeScript con `moduleResolution: "Bundler"` exige el sufijo `.js` en los
  // imports (lo requiere `verbatimModuleSyntax`). El webpack de Next, en
  // cambio, resuelve los archivos del bundle a partir de `.ts/.tsx`. Sin este
  // alias falla el build en cuanto aparece un import con `.js` hacia un
  // archivo `.ts(x)`. Mantenemos la convencion de imports del repo y dejamos
  // que webpack haga el mapeo.
  webpack(config) {
    config.resolve ??= {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
