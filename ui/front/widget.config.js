/**
 * Widget Build Configuration
 * 用于将 TypeScript 源文件编译并压缩成独立的 JS 文件
 */
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
    build: {
        // 输出目录
        outDir: 'public',
        // 清空输出目录
        emptyOutDir: false,
        lib: {
            // 入口文件
            entry: path.resolve(__dirname, 'src/widget/customer-service-widget.ts'),
            // 输出文件名
            fileName: () => 'customer-service-widget.js',
            // 格式：IIFE (立即执行函数)
            formats: ['iife'],
            // 全局变量名（可选）
            name: 'CustomerServiceWidget',
        },
        rollupOptions: {
            output: {
                // 不生成 sourcemap
                sourcemap: false,
                // 压缩选项
                compact: true,
                // 不使用 ES6 模块语法
                format: 'iife',
                // 输出单个文件
                inlineDynamicImports: true,
            },
        },
        // 压缩
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: false, // 保留 console.log
                drop_debugger: true,
                pure_funcs: ['console.debug'],
            },
            format: {
                comments: false, // 移除注释
            },
        },
        // 目标浏览器
        target: 'es2015',
    },
})
