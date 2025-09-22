/** @type {import('next').NextConfig} */


const nextConfig = {
  // output: 'export',
  reactStrictMode: false,
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  productionBrowserSourceMaps: true,
  images: {
    // 允许加载本地图片
    unoptimized: true,
    
    // 配置远程图片域名白名单
    remotePatterns: [
      // 添加开发环境可能需要的本地域名
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**'
      }
    ],
    
    // 设置图片格式支持
    formats: ['image/webp', 'image/avif'],
    
    // 设置图片大小限制
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },
  
  logging: {
    fetches: {
      fullUrl: true
    }
  },
  
  async rewrites() {
    const rewritesPath = [];
    if (process.env.NODE_ENV === 'development') {
      rewritesPath.push(
        ...[
          {
            source: '/api/:path*',
            destination: 'http://10.9.35.17:8090/api/:path*',
            basePath: false
          }
        ]
      );
    }
    return rewritesPath;
  }
};

export default nextConfig;
