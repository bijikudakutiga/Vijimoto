/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

// Hanya dipakai saat development lokal (npm run dev), tidak mempengaruhi
// build produksi ke Cloudflare Workers.
if (process.env.NODE_ENV !== "production") {
  const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
}

export default nextConfig;
