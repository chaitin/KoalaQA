'use client';

import { Button, Stack, Typography, Box } from '@mui/material';
import { useAuthCheck } from '@/hooks/useAuthCheck';

/**
 * 演示组件：展示如何使用 useAuthCheck hook
 */
const AuthRequiredDemo = () => {
  const { checkAuth, isLoggedIn, user } = useAuthCheck();

  const handleProtectedAction = () => {
    checkAuth(() => {
      alert('这是一个需要登录的操作！');
    });
  };

  return (
    <Box sx={{ p: 3, border: '1px solid #ddd', borderRadius: 2, m: 2 }}>
      <Typography variant="h6" gutterBottom>
        登录状态检查演示
      </Typography>
      
      <Stack spacing={2}>
        <Typography>
          当前登录状态: {isLoggedIn ? '已登录' : '未登录'}
        </Typography>
        
        {isLoggedIn && (
          <Typography>
            用户信息: {user?.username} (ID: {user?.uid})
          </Typography>
        )}
        
        <Button 
          variant="contained" 
          onClick={handleProtectedAction}
          sx={{ maxWidth: 200 }}
        >
          执行需要登录的操作
        </Button>
        
        <Typography variant="body2" color="text.secondary">
          如果未登录，点击按钮会跳转到登录页面并带上当前页面的重定向参数
        </Typography>
      </Stack>
    </Box>
  );
};

export default AuthRequiredDemo;