/** @type {import('next').NextConfig} */

const nextConfig = {
  // 开启严格模式以发现潜在问题
  reactStrictMode: true,
  
  // 生产环境使用 standalone 输出
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // 生产环境不暴露 source maps（安全考虑）
  productionBrowserSourceMaps: false,
  
  // 图片优化配置
  images: {
    // 开发环境可以 unoptimized，生产环境应该优化
    unoptimized: process.env.NODE_ENV === 'development',
    
    // 配置远程图片域名白名单
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**'
      }
    ],
    
    // 设置图片格式支持
    formats: ['image/webp', 'image/avif'],
    
    // SVG 安全配置
    dangerouslyAllowSVG: true,
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
