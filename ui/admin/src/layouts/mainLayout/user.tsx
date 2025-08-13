import { Stack, Box } from '@mui/material';
import { Outlet, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';

const MainLayout = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // 检查用户是否已登录
    const token = localStorage.getItem('auth_token');
    const userInfo = localStorage.getItem('user_info');

    if (token && userInfo) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  // 如果还在检查认证状态，显示加载状态
  if (isAuthenticated === null) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div>加载中...</div>
      </Box>
    );
  }

  // 如果未认证，重定向到登录页
  if (!isAuthenticated) {
    // return <Navigate to='/login' replace />;
  }
  return (
    <Stack
      direction='row'
      sx={{
        position: 'relative',
        height: '100vh',
        minHeight: '680px',
        fontSize: '16px',
        bgcolor: 'background.paper',
      }}
    >
      <Sidebar />
      <Stack gap={2} sx={{ flex: 1, minWidth: 0, mr: 2, ml: 0 }}>
        <Header />
        <Box
          sx={{
            height: 'calc(100% - 43px)',
            overflow: 'auto',
            mb: 2,
            borderRadius: 2.5,
          }}
        >
          <Outlet />
        </Box>

        {/* </Container> */}
      </Stack>
    </Stack>
  );
};

export default MainLayout;
