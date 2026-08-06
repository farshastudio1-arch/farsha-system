import type { NextConfig } from "next";

import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['farshastudio.com', 'titipsewa.farshastudio.com'],
    },
  },
};

export default nextConfig;
