'use client';
import Link from 'next/link';
import Image from 'next/image';
import error from '@/asset/img/500.png';
import { Box, Stack, Button, Typography, Collapse } from '@mui/material';
import { useState } from 'react';

export default function Error({
  error: err,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);

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
          <Typography variant='h6'>发生错误</Typography>
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
          <Button size='small' onClick={() => setShowDetail(v => !v)}>
            {showDetail ? '隐藏详情' : '显示详情'}
          </Button>
          <Collapse in={showDetail} unmountOnExit sx={{ width: '100%' }}>
            <Box
              component='pre'
              sx={{
                width: '100%',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {process.env.NODE_ENV === 'development' ? err?.stack || '' : '生产环境默认隐藏堆栈信息'}
            </Box>
          </Collapse>
        </Stack>
        <Stack direction='row' gap={2}>
          <Button variant='contained' onClick={reset} size='large'>
            重试
          </Button>
          <Button component={Link} href='/' size='large'>
            返回首页
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
