/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'txiabxkbrrgccmldewtz.supabase.co',
      },
    ],
  },
};

export default nextConfig;
