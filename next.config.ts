import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Cho phép gửi ảnh khảo sát/sản phẩm (base64 nén) qua Server Action — mặc định 1MB là quá nhỏ.
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    // Ảnh sản phẩm lấy từ Haravan CDN.
    remotePatterns: [
      { protocol: "https", hostname: "**.haravan.com" },
      { protocol: "https", hostname: "product.hstatic.net" },
      { protocol: "https", hostname: "**.hstatic.net" },
    ],
  },
};

export default nextConfig;
