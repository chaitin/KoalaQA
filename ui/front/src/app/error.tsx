'use client';
import Link from 'next/link';
import Image from 'next/image';
import error from '@/asset/img/500.png';
import { Box, Stack, Button, Typography, Collapse, Chip, IconButton, Tooltip, Alert } from '@mui/material';
import { useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export default function Error({
  error: err,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // 检测是否为生产环境
  const isProduction = process.env.NODE_ENV === 'production';
  // 生产环境默认显示详情，开发环境默认隐藏
  const [showDetail, setShowDetail] = useState(isProduction);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // 复制错误信息到剪贴板
  const copyErrorInfo = async () => {
    const errorInfo = {
      message: err?.message,
      stack: err?.stack,
      digest: err?.digest,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      url: typeof window !== 'undefined' ? window.location.href : 'N/A',
      environment: process.env.NODE_ENV,
      ...(err as any),
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
      setCopyStatus('success');
      // 3秒后重置状态
      setTimeout(() => setCopyStatus('idle'), 3000);
    } catch (error) {
      console.error('复制失败:', error);
      setCopyStatus('error');
      // 3秒后重置状态
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  };

  return (
    <Box
      sx={{
        pt: 8,
        background: 'url(/bg.png) no-repeat top left / 100% auto',
        height: '100vh',
      }}
    >
      <Stack
        sx={{
          width: 1200,
          overflow: 'auto',
          height: 'calc(100vh - 64px)',
          pb: 6,
          mx: 'auto',
        }}
        gap={3}
        justifyContent='center'
        alignItems='center'
      >
        <Image src={error} alt='500'></Image>
        <Stack alignItems='center' gap={1} sx={{ maxWidth: 900, mx: 'auto', px: 2 }}>
          <Stack direction='row' alignItems='center' gap={1}>
            <Typography variant='h6'>发生错误</Typography>
            <Chip 
              label={isProduction ? '生产环境' : '开发环境'} 
              size='small' 
              color={isProduction ? 'error' : 'warning'}
              variant='outlined'
            />
          </Stack>
          {(() => {
            // 优先展示后端返回的 message/status/code
            const errWithData = err as { isBackend?: boolean; data?: unknown; status?: number; code?: number; url?: string };
            const isBackend: boolean = errWithData.isBackend ?? false;
            const backendData = errWithData.data as { message?: string } | undefined;
            const status: number | undefined = errWithData.status;
            const code: number | undefined = errWithData.code;
            const url: string | undefined = errWithData.url;
            if (isBackend) {
              return (
                <>
                  <Typography variant='body2' color='text.secondary' sx={{ wordBreak: 'break-all', textAlign: 'center' }}>
                    {backendData?.message || err.message}
                  </Typography>
                  {(status || code) && (
                    <Typography variant='caption' color='text.disabled'>
                      {status ? `HTTP ${status}` : ''} {code ? ` | Code: ${code}` : ''}
                    </Typography>
                  )}
                  {url && (
                    <Typography variant='caption' color='text.disabled'>
                      接口: {url}
                    </Typography>
                  )}
                </>
              );
            }
            return (
              err?.message && (
                <Typography variant='body2' color='text.secondary' sx={{ wordBreak: 'break-all', textAlign: 'center' }}>
                  {err.message}
                </Typography>
              )
            );
          })()}
          {err?.digest && (
            <Typography variant='caption' color='text.disabled'>
              digest: {err.digest}
            </Typography>
          )}
          <Stack direction='row' gap={1} alignItems='center'>
            <Button size='small' onClick={() => setShowDetail(v => !v)}>
              {showDetail ? '隐藏详情' : '显示详情'}
            </Button>
            <Tooltip title='复制错误信息'>
              <IconButton size='small' onClick={copyErrorInfo}>
                <ContentCopyIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          </Stack>
          
          {/* 复制状态提示 */}
          {copyStatus !== 'idle' && (
            <Alert 
              severity={copyStatus === 'success' ? 'success' : 'error'} 
              sx={{ width: '100%', maxWidth: 400 }}
            >
              {copyStatus === 'success' ? '错误信息已复制到剪贴板' : '复制失败，请手动复制'}
            </Alert>
          )}
          <Collapse in={showDetail} unmountOnExit sx={{ width: '100%' }}>
            <Box
              sx={{
                width: '100%',
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              {/* 错误堆栈信息 */}
              {err?.stack && (
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant='subtitle2' gutterBottom>
                    错误堆栈:
                  </Typography>
                  <Box
                    component='pre'
                    sx={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: 12,
                      lineHeight: 1.5,
                      m: 0,
                      fontFamily: 'monospace',
                    }}
                  >
                    {err.stack}
                  </Box>
                </Box>
              )}
              
              {/* 详细错误信息 */}
              <Box sx={{ p: 2 }}>
                <Typography variant='subtitle2' gutterBottom>
                  详细错误信息:
                </Typography>
                <Box
                  component='pre'
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: 12,
                    lineHeight: 1.5,
                    m: 0,
                    fontFamily: 'monospace',
                    bgcolor: 'grey.50',
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  {JSON.stringify({
                    message: err?.message,
                    digest: err?.digest,
                    timestamp: new Date().toISOString(),
                    url: typeof window !== 'undefined' ? window.location.href : 'N/A',
                    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
                    environment: process.env.NODE_ENV,
                    ...(err as any),
                  }, null, 2)}
                </Box>
              </Box>
            </Box>
          </Collapse>
        </Stack>
        <Stack direction='row' gap={2}>
          <Button variant='contained' onClick={reset} size='large'>
            重试
          </Button>
          <Link href='/' style={{ textDecoration: 'none' }}>
            <Button size='large'>
              返回首页
            </Button>
          </Link>
        </Stack>
      </Stack>
    </Box>
  );
}
