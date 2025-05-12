import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      // Extract domain from Supabase URL
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname
    ],
  },
};

export default nextConfig;
