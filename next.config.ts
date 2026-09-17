import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Native course assets are validated to 25 MiB; the extra allowance covers
      // multipart encoding without accepting unbounded request bodies.
      bodySizeLimit: "30mb",
    },
  },
  async redirects() {
    return [
      { source: "/admin/life-mapping-u", destination: "/admin/assessments/life-mapping-u", permanent: false },
      { source: "/admin/life-mapping-u/:assessmentId", destination: "/admin/assessments/life-mapping-u/:assessmentId", permanent: false },
    ];
  },
};

export default nextConfig;
