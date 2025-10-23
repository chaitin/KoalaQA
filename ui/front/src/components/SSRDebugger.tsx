'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';

interface SSRDebuggerProps {
  componentName: string;
  data?: any;
  showInProduction?: boolean;
}

/**
 * SSR调试工具组件
 * 帮助开发者排查服务端渲染相关的问题
 */
export const SSRDebugger: React.FC<SSRDebuggerProps> = ({
  componentName,
  data,
  showInProduction = false,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsClient(true);
  }, []);

  // 只在开发环境或明确允许时显示
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null;
  }

  return (
    <Paper
      sx={{
        position: 'fixed',
        top: 10,
        right: 10,
        p: 2,
        maxWidth: 300,
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}
    >
      <Typography variant="h6" sx={{ color: 'yellow', mb: 1 }}>
        SSR Debug: {componentName}
      </Typography>
      
      <Box sx={{ mb: 1 }}>
        <Chip
          label={isMounted ? 'Mounted' : 'Not Mounted'}
          color={isMounted ? 'success' : 'error'}
          size="small"
          sx={{ mr: 1 }}
        />
        <Chip
          label={isClient ? 'Client' : 'Server'}
          color={isClient ? 'primary' : 'secondary'}
          size="small"
        />
      </Box>

      {data && (
        <Box>
          <Typography variant="subtitle2" sx={{ color: 'lightblue' }}>
            Data:
          </Typography>
          <pre style={{ 
            fontSize: '10px', 
            overflow: 'auto', 
            maxHeight: '200px',
            margin: 0,
            whiteSpace: 'pre-wrap'
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </Box>
      )}

      <Box sx={{ mt: 1, fontSize: '10px', color: 'lightgray' }}>
        <div>Environment: {process.env.NODE_ENV}</div>
        <div>Timestamp: {new Date().toLocaleTimeString()}</div>
      </Box>
    </Paper>
  );
};

/**
 * Hook for SSR debugging
 */
export const useSSRDebug = (componentName: string, data?: unknown) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const debugInfo = {
    componentName,
    isMounted,
    isClient: typeof window !== 'undefined',
    data,
    timestamp: new Date().toISOString(),
  };

  // 在开发环境下输出调试信息
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SSR Debug - ${componentName}]`, debugInfo);
  }

  return debugInfo;
};

export default SSRDebugger;
