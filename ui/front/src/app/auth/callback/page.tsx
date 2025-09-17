'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function AuthCallback() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // 获取OAuth回调参数
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // 这里包含了原始的重定向URL
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth login error:', error);
      // 重定向到登录页面并显示错误
      window.location.href = '/login?error=' + encodeURIComponent(error);
      return;
    }

    if (code) {
      // OAuth登录成功，通常后端会自动设置cookie
      // 这里我们等待一下然后重定向
      setTimeout(() => {
        let redirectUrl = '/';
        
        // 如果state参数包含重定向URL，使用它
        if (state) {
          try {
            redirectUrl = decodeURIComponent(state);
          } catch (e) {
            console.error('Failed to decode redirect URL:', e);
          }
        }
        
        window.location.href = redirectUrl;
      }, 1000);
    } else {
      // 没有code参数，可能是直接访问了这个页面
      window.location.href = '/login';
    }
  }, [searchParams]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body1" color="text.secondary">
        正在处理登录...
      </Typography>
    </Box>
  );
}