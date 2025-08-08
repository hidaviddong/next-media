import type { NextConfig } from "next";
import { TMDB_IMAGE_BASE_URL } from "./lib/constant";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [new URL(`${TMDB_IMAGE_BASE_URL}/**`)],
  },
};

export default nextConfig;
