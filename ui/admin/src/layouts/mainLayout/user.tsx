import { getAdminModelList, getAdminSystemPublicAddress } from '@/api';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import ModelManagementModal from '@/pages/settings/component/ModelManagementModal';
import Access from '@/pages/settings/component/Access';
import { Box, Button, Modal, Stack, Typography } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useLocalStorageState } from 'ahooks';
import { AuthContext, CommonContext } from '@/context';
import Card from '@/components/card';

const MainLayout = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [needModel, setNeedModel] = useState(false);
  const [needAddress, setNeedAddress] = useState(false);
  const [user] = useContext(AuthContext);
  useEffect(() => {
    if (user?.uid) {
      setIsAuthenticated(true);
      // 登录后检查必要配置
      checkNecessaryConfigurations();
    } else {
      setIsAuthenticated(false);
    }
  }, [user]);

  const checkNecessaryConfigurations = async () => {
    try {
      const [models, addr] = await Promise.all([
        getAdminModelList(),
        getAdminSystemPublicAddress(),
      ]);
      const lackModel = !models || models.length === 0;
      const lackAddr = !addr || !addr.address || addr.address.trim() === '';
      setNeedModel(lackModel);
      setNeedAddress(lackAddr);
      setShowGuide(lackModel || lackAddr);
    } catch (e) {
      // 网络或接口异常时，强制进入引导
      setNeedModel(true);
      setNeedAddress(true);
      setShowGuide(true);
    }
  };

  const tryCloseGuide = () => {
    // 只有当两者都已配置时，才可关闭
    if (!needModel && !needAddress) {
      setShowGuide(false);
    }
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

      {/* 强制配置引导弹窗（模型 + 访问地址） */}
      <Modal
        open={showGuide}
        onClose={() => {}} // 禁止遮罩关闭
        disableEscapeKeyDown
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack
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
          <Stack spacing={2}>
            <Box>
              <Box sx={{ fontSize: 16, fontWeight: 600, mb: 2 }}>社区基础配置</Box>
              <Access
                // 在保存成功后，重新校验并尝试关闭
                onSaved={() => {
                  setNeedAddress(false);
                  checkNecessaryConfigurations().then(tryCloseGuide);
                }}
              />
            </Box>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ mb: 0 }}>
                模型管理
              </Typography>
              <ModelManagementModal
                open={true}
                mandatory={true}
                onConfigured={() => {
                  setNeedModel(false);
                  checkNecessaryConfigurations();
                }}
              />
            </Card>
          </Stack>
          <Button
            variant="outlined"
            disabled={needAddress || needModel}
            onClick={tryCloseGuide}
            sx={{ ml: 'auto', mt: 2 }}
          >
            完成
          </Button>
        </Stack>
      </Modal>
    </>
  );
};

export default MainLayout;
