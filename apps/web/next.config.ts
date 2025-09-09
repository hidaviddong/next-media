import type { NextConfig } from "next";
import { TMDB_IMAGE_BASE_URL } from "@next-media/configs/constant";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [new URL(`${TMDB_IMAGE_BASE_URL}/**`)],
  },
  serverExternalPackages: [
    "@next-media/auth",
    "@next-media/configs",
    "@next-media/db",
    "@next-media/ui",
    "@next-media/worker",
  ],
};

export default nextConfig;
