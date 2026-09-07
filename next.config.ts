import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/admin/life-mapping-u", destination: "/admin/assessments/life-mapping-u", permanent: false },
      { source: "/admin/life-mapping-u/:assessmentId", destination: "/admin/assessments/life-mapping-u/:assessmentId", permanent: false },
    ];
  },
};

export default nextConfig;
