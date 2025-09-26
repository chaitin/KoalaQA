import { getAdminModelList } from '@/api';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import ModelManagementModal from '@/pages/settings/component/ModelManagementModal';
import { Box, Modal, Stack } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useLocalStorageState } from 'ahooks';
import { AuthContext, CommonContext } from '@/context';

const MainLayout = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showModelModal, setShowModelModal] = useState(false);
  const [user]  = useContext(AuthContext);
  useEffect(() => {
    if (user?.uid) {
      setIsAuthenticated(true);
      // 检查是否已配置模型
      checkModelConfiguration();
    } else {
      setIsAuthenticated(false);
    }
  }, [user]);

  const checkModelConfiguration = () => {
    getAdminModelList()
      .then(res => {
        // 如果没有配置任何模型，则显示强制弹窗
        if (res.length === 0) {
          setShowModelModal(true);
        }
      })
      .catch(() => {
        // 如果获取模型列表失败，默认显示弹窗
        setShowModelModal(true);
      });
  };

  const handleModelConfigured = () => {
    setShowModelModal(false);
  };

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
  return (
    <>
      <Stack
        direction="row"
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

      {/* 强制模型配置弹窗 */}
      <Modal
        open={showModelModal}
        onClose={() => {}} // 禁用点击遮罩关闭
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            width: '80%',
            maxWidth: 800,
            maxHeight: '90vh',
            overflow: 'auto',
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 24,
            p: 3,
          }}
        >
          <ModelManagementModal
            open={showModelModal}
            mandatory={true}
            onConfigured={handleModelConfigured}
          />
        </Box>
      </Modal>
    </>
  );
};

export default MainLayout;
