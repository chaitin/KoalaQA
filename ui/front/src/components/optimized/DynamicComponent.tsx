/**
 * 动态导入组件包装器
 * 简化动态导入的使用
 */

'use client';

import dynamic from 'next/dynamic';
import { ComponentType, JSX } from 'react';
import { Box, CircularProgress } from '@mui/material';

// 默认加载组件
export function DefaultLoading() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
        width: '100%',
      }}
    >
      <CircularProgress size={40} />
    </Box>
  );
}

// 创建动态组件的辅助函数
export function createDynamicComponent<P = Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    loading?: () => JSX.Element;
    ssr?: boolean;
  }
) {
  return dynamic(importFn, {
    loading: options?.loading || DefaultLoading,
    ssr: options?.ssr ?? true,
  });
}

// 预定义的常用动态组件
export const DynamicEditor = createDynamicComponent(
  () => import('@/components/editor'),
  { ssr: false }
);

export const DynamicMarkdown = createDynamicComponent(
  () => import('@/components/markDown'),
  { ssr: true }
);

