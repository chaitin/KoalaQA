/**
 * 服务端错误边界组件
 * 用于捕获和处理服务端渲染错误
 */

'use client';

import React from 'react';
import { Box, Button, Typography, Container } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ServerErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // 创建一个可序列化的错误对象，避免序列化问题
    const serializableError = {
      message: error.message || 'An unknown error occurred',
      name: error.name || 'Error',
      stack: error.stack || undefined,
    } as Error;
    
    return {
      hasError: true,
      error: serializableError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 安全地记录错误信息，避免序列化问题
    const errorMessage = error?.message || 'Unknown error';
    const errorName = error?.name || 'Error';
    
    console.error('ServerErrorBoundary caught an error:', {
      message: errorMessage,
      name: errorName,
      componentStack: errorInfo?.componentStack || 'No component stack available'
    });
    
    // 服务端错误处理逻辑
    if (typeof window === 'undefined') {
      // 服务端错误处理 - 可以在这里添加错误上报逻辑
      console.error('Server-side error occurred:', errorMessage);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              textAlign: 'center',
              py: 4,
            }}
          >
            <ErrorOutlineIcon
              sx={{
                fontSize: 64,
                color: 'error.main',
                mb: 2,
              }}
            />
            <Typography variant="h5" gutterBottom>
              服务端渲染出错
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {this.state.error?.message || '页面渲染失败，请稍后重试'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={this.handleReset}
              >
                重试
              </Button>
              <Button
                variant="outlined"
                onClick={() => window.location.href = '/'}
              >
                返回首页
              </Button>
            </Box>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ServerErrorBoundary;
