import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';

const nextConfig: NextConfig = isStaticExport
  ? {
      output: 'export',
    }
  : {};

export default nextConfig;
