/**
 * 动态导入配置
 * 用于代码分割和懒加载大型组件
 */

import dynamic from 'next/dynamic';
import { ComponentType, JSX } from 'react';

/**
 * 创建带有加载状态的动态组件
 */
export const createDynamicComponent = <P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    loading?: () => JSX.Element;
    ssr?: boolean;
  }
) => {
  return dynamic(importFunc, {
    loading: options?.loading || (() => <div>加载中...</div>),
    ssr: options?.ssr ?? true,
  });
};

/**
 * 常见的大型组件懒加载配置
 */

// Markdown 编辑器（体积大，不是首屏必需）
export const LazyMarkdownEditor = dynamic(
  () => import('@/components/mdEditor'),
  {
    loading: () => <div>编辑器加载中...</div>,
    ssr: false, // 编辑器通常不需要SSR
  }
);

// 代码编辑器（CodeMirror体积大）
export const LazyCodeEditor = dynamic(
  () => import('react-codemirror2').then((mod) => mod.Controlled),
  {
    loading: () => <div>代码编辑器加载中...</div>,
    ssr: false,
  }
);

// 头像面板（不是首屏必需）
export const LazyProfilePanel = dynamic(
  () => import('@/components/header/profilePanel'),
  {
    loading: () => <div>加载中...</div>,
    ssr: false,
  }
);

