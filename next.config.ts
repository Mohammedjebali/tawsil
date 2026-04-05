import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  devIndicators: false,
};

export default withSentryConfig(nextConfig, {
  org: "tawsil",
  project: "tawsil-web",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
});
