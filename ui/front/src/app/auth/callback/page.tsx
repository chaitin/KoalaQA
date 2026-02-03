'use client';

import { useEffect, useContext, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import { AuthContext } from '@/components/authProvider';
import { getUser } from '@/api';
import { useForumStore } from '@/store';

export default function AuthCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { fetchUser, isAuthenticated } = useContext(AuthContext);
  const refreshForums = useForumStore((s) => s.refreshForums);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // 防止重复执行
    if (isProcessing) {
      return;
    }

    const processLogin = async () => {
      setIsProcessing(true);

      // 获取OAuth回调参数
      const code = searchParams?.get('code');
      const state = searchParams?.get('state'); // 这里包含了原始的重定向URL
      const error = searchParams?.get('error');

      if (error) {
        console.error('OAuth login error:', error);
        window.location.href = '/login?error=' + encodeURIComponent(error);
        return;
      }

      // 尝试检测是否已经有有效会话（处理HttpOnly cookie且上下文未更新的情况）
      let canProceed = !!(code || isAuthenticated);
      if (!canProceed) {
        try {
          const res = await getUser();
          if (res?.uid) {
            canProceed = true;
          }
        } catch (e) {
          // 忽略检查错误
        }
      }

      // 如果有code，或者是已经认证的状态，或者是检查到了有效会话
      if (canProceed) {
        try {
          // 刷新用户信息 (fetchUser 现在会共享 Promise，所以安全)
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
          // 即使出错也尝试重定向到首页
          router.replace('/');
        }
      } else {
        // 没有code且未认证，去登录页
        window.location.href = '/login';
      }
    };

    processLogin();
  }, [searchParams, fetchUser, refreshForums, router, isAuthenticated]); // Dependencies updated

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