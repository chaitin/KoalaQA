/** @type {import('next').NextConfig} */

const nextConfig = {
  // 开启严格模式以发现潜在问题
  reactStrictMode: true,

  // 生产环境使用 standalone 输出
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // 生产环境不暴露 source maps（安全考虑）
  productionBrowserSourceMaps: false,

  // 忽略构建时的未处理Promise拒绝
  onDemandEntries: {
    // 忽略构建时的错误
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // 性能优化：SWC 压缩在 Next.js 15+ 中默认启用

  // 启用实验性功能
  experimental: {
    // 优化包导入，减少 bundle 大小
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
      '@ctzhian/tiptap',
      '@ctzhian/ui',
    ],

    // 启用 PPR (Partial Prerendering) - Next.js 15 新特性
    // ppr: 'incremental',

    // 启用bundle分析
    // bundlePagesRouterDependencies: true, // 这个选项在Next.js 16中已移除
  },

  // 编译器优化
  compiler: {
    // 移除 console.log (生产环境)
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,

    // Emotion 优化
    emotion: true,
  },

  // ESLint 配置已移至 next.config.mjs 外部
  // 使用 next lint 命令进行代码检查

  // 图片优化配置
  images: {
    // 配置远程图片域名白名单
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
    ],

    // 配置路径重写，将OSS路径映射到正确的代理路径
    path: '/_next/image',

    // 设置图片格式支持 - Next.js只支持webp和avif格式优化
    formats: ['image/webp', 'image/avif'],

    // 图片质量配置 - Next.js 16 必需
    qualities: [25, 50, 75, 85, 100],

    // 图片尺寸设备断点
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // 图片缓存优化 - 增加缓存时间减少重复请求
    minimumCacheTTL: 300, // 5分钟缓存

    // 图片加载优化
    loader: 'default',
    unoptimized: false,

    // SVG 安全配置
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // 配置需要转译的外部包
  transpilePackages: ['@ctzhian/tiptap', '@ctzhian/ui'],

  // 性能日志
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // 页面扩展名
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Headers 配置
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|gif|bmp|tiff|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/font/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  async rewrites() {
    const rewritesPath = []
    if (process.env.NODE_ENV === 'development') {
      const target = process.env.TARGET || 'https://httpbin.org'
      const imageTarget = process.env.TARGET || 'https://httpbin.org'

      // 添加调试输出
      console.log('🔧 Proxy target:', target)

      rewritesPath.push(
        ...[
          {
            source: '/api/:path*',
            destination: `${target}/api/:path*`,
            basePath: false,
          },
          // 添加图片代理重写，解决图片加载缓慢问题
          {
            source: '/koala/public/:path*',
            destination: `${imageTarget}/koala/public/:path*`,
            basePath: false,
          },
        ],
      )
    }
    return rewritesPath
  },
}

export default nextConfig
