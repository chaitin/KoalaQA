'use client';

import { useEffect, useContext, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import { AuthContext } from '@/components/authProvider';
import { useForumStore } from '@/store';

export default function AuthCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { fetchUser } = useContext(AuthContext);
  const refreshForums = useForumStore((s) => s.refreshForums);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // 防止重复执行
    if (isProcessing) {
      return;
    }

    // 获取OAuth回调参数
    const code = searchParams?.get('code');
    const state = searchParams?.get('state'); // 这里包含了原始的重定向URL
    const error = searchParams?.get('error');

    if (error) {
      console.error('OAuth login error:', error);
      // 重定向到登录页面并显示错误
      window.location.href = '/login?error=' + encodeURIComponent(error);
      return;
    }

    if (code) {
      setIsProcessing(true);
      
      // OAuth登录成功，后端已经设置了cookie
      // 等待一下，然后刷新用户信息和forum列表
      setTimeout(async () => {
        try {
          // 刷新用户信息
          await fetchUser();
          
          // 刷新forum列表
          const refreshedForums = await refreshForums();
          
          // 触发登录成功事件
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:success'));
          }
          
          // 处理重定向
          let redirectUrl = '/';
          
          // 如果state参数包含重定向URL，使用它
          if (state) {
            try {
              redirectUrl = decodeURIComponent(state);
            } catch (e) {
              console.error('Failed to decode redirect URL:', e);
            }
          }
          
          // 如果没有指定重定向URL，且有forum列表，跳转到第一个forum
          if (redirectUrl === '/' && refreshedForums && refreshedForums.length > 0) {
            const firstForum = refreshedForums[0];
            redirectUrl = firstForum.route_name ? `/${firstForum.route_name}` : `/${firstForum.id}`;
          }
          
          router.replace(redirectUrl);
        } catch (error) {
          console.error('Error processing OAuth callback:', error);
          // 即使出错也尝试重定向
          let redirectUrl = '/';
          if (state) {
            try {
              redirectUrl = decodeURIComponent(state);
            } catch (e) {
              console.error('Failed to decode redirect URL:', e);
            }
          }
          router.replace(redirectUrl);
        }
      }, 1000);
    } else {
      // 没有code参数，可能是直接访问了这个页面
      window.location.href = '/login';
    }
  }, [searchParams, fetchUser, refreshForums, router, isProcessing]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%',
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