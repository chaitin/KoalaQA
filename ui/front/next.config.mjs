/** @type {import('next').NextConfig} */


const nextConfig = {
  // output: 'export',
  reactStrictMode: false,
  output: 'standalone',
  productionBrowserSourceMaps: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'thirdwx.qlogo.cn',
        port: '',
        pathname: '/**',
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  async rewrites() {
    const rewritesPath = [];
    if (process.env.NODE_ENV === 'development') {
      rewritesPath.push(
        ...[
          {
            source: '/api/:path*',
            destination: 'http://10.9.35.17:8090/api/:path*',
            basePath: false,
          },
        ]
      );
    }
    return rewritesPath;
  },
  // generateBuildId: async () => {
  //   const commitHash = require('child_process')
  //     .execSync('git rev-parse --short HEAD')
  //     .toString()
  //     .trim();
  //   process.env.NEXT_PUBLIC_BUILD_ID = commitHash; // 暴露给客户端
  //   return process.env.GIT_HASH
  // },
}

export default nextConfig;
