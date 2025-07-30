// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // bảo đảm tất cả request đều có COOP/COEP
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
      // tùy chọn: tăng tính tương thích cho static assets
      {
        source: "/pyodide/:path*",
        headers: [
          // đảm bảo tài nguyên này được coi là same-origin
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
