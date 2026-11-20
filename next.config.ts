import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El dev server sólo confía en `localhost` por defecto; QA accede por IP.
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
