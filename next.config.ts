import type { NextConfig } from "next";

/**
 * Next.js 16 Enterprise Configuration
 * 
 * Features enabled:
 * - React Compiler for automatic memoization
 * - Turbopack with persistent caching
 * - Enterprise security headers
 * - Dynamic IO for Cache Components
 */
const nextConfig: NextConfig = {
  // Enable React 19.2 Compiler for automatic memoization
  // This eliminates the need for manual useMemo/useCallback
  reactCompiler: true,

  // Enable typed routes for better type safety (moved from experimental)
  typedRoutes: true,

  // Turbopack is now default in Next.js 16
  // No extra config needed for defaults

  // Image optimization configuration
  images: {
    // Define allowed remote image sources
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Enterprise security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Control referrer information
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Enable XSS protection (legacy browsers)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Permissions policy
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com;",
          },
        ],
      },
      // API routes specific headers
      {
        source: "/api/:path*",
        headers: [
          // Prevent caching of API responses by default
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },

  // Logging configuration for debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
