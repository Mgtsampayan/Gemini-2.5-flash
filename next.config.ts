import type { NextConfig } from "next";

/**
 * Next.js 16 Enterprise Configuration
 * 
 * Features enabled:
 * - React Compiler for automatic memoization
 * - Turbopack with persistent caching
 * - Enterprise security headers
 * - Bundle optimization
 * - Image optimization
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
    // Optimize image formats
    formats: ["image/avif", "image/webp"],
    // Limit image sizes for faster loading
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Production optimizations
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true, // Enable gzip compression

  // Bundle optimization - split vendor chunks
  experimental: {
    // Optimize package imports for tree shaking
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-avatar",
      "@radix-ui/react-slot",
      "@radix-ui/react-toast",
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
          // DNS prefetch for Gemini API
          { key: "Link", value: "<https://generativelanguage.googleapis.com>; rel=dns-prefetch" },
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
      // Static assets - enable caching
      {
        source: "/(.*)\\.(ico|png|svg|jpg|jpeg|gif|webp|avif)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
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

