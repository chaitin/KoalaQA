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


// 代码编辑器（CodeMirror体积大）
// ⚠️ 重要迁移警告：CodeMirror v5 到 v6 是破坏性升级
// 
// 当前使用 @uiw/react-codemirror v4.25.2 (基于 CodeMirror v5)
// 同时安装了 codemirror v6.0.2，存在版本冲突风险
//
// 主要破坏性变更：
// 1. API 完全重写 - 配置系统从命名选项改为扩展树
// 2. DOM 结构变更 - .CodeMirror -> .cm-editor, .CodeMirror-line -> .cm-line
// 3. 状态管理变更 - 使用事务系统替代事件系统
// 4. 模块化架构 - 需要安装多个独立包
// 5. 自定义模式 - defineMode 被 StreamLanguage 替代
//
// 迁移前必须：
// - 全面测试所有编辑器功能
// - 更新相关 CSS 选择器
// - 重构配置和事件处理代码
// - 检查自定义语言模式兼容性
//
// 参考：https://codemirror.net/docs/migration/
export const LazyCodeEditor = dynamic(
  () => import('@uiw/react-codemirror').then((mod) => mod.default),
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

