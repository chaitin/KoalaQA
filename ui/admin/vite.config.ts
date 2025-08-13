import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/admin/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      proxy: {
        '^/api/': env.VITE_API_BASE_URL || 'http://localhost:8080/',
      },
      host: '0.0.0.0',
      port: 3400,
    },
    // 手动配置 Monaco Editor 支持
    define: {
      // 禁用 Monaco Editor 从 CDN 加载
      'process.env.REACT_APP_MONACO_CDN': JSON.stringify('false'),
    },
    // 优化构建配置
    // build: {
    //   rollupOptions: {
    //     output: {
    //       manualChunks: {
    //         'monaco-editor': ['monaco-editor'],
    //         'monaco-react': ['@monaco-editor/react'],
    //       },
    //     },
    //   },
    //   // 复制 Monaco Editor 的静态资源
    //   copyPublicDir: true,
    // },
    // 确保 Monaco Editor 被正确优化
    // optimizeDeps: {
    //   include: ['monaco-editor', '@monaco-editor/react'],
    // },
    // // 处理 worker 文件
    // worker: {
    //   format: 'es',
    // },
    // 确保 Monaco Editor workers 能正确加载
    // assetsInclude: ['**/*.worker.js'],
  };
});
