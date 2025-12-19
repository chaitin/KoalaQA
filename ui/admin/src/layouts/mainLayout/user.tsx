import { getAdminModelList, getAdminSystemPublicAddress, getAdminKb, ModelLLMType } from '@/api';
import { useConfigStore, useForumStore } from '@/store';
import Card from '@/components/card';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import { AuthContext } from '@/context';
import Access from '@/pages/settings/component/Access';
import ModelManagementModal from '@/pages/settings/component/ModelManagementModal';
import { Box, Button, Link, Modal, Stack, Typography } from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

const MainLayout = () => {
  const [showGuide, setShowGuide] = useState(false);
  const [needModel, setNeedModel] = useState(false);
  const [needAddress, setNeedAddress] = useState(false);
  const [user] = useContext(AuthContext);
  const { setKbId } = useConfigStore();
  const { refreshForums } = useForumStore();
  const isAuthenticated = user?.uid ? true : user === undefined ? null : false;

  useEffect(() => {
    refreshForums();
  }, [refreshForums]);

  const checkNecessaryConfigurations = useCallback(async () => {
    try {
      const [models, addr, kbRes] = await Promise.all([
        getAdminModelList(),
        getAdminSystemPublicAddress(),
        getAdminKb(),
      ]);

      const requiredModelTypes = [
        ModelLLMType.LLMTypeChat,
        ModelLLMType.LLMTypeEmbedding,
        ModelLLMType.LLMTypeRerank,
      ];
      const modelList = Array.isArray(models) ? models : [];
      const lackModel = requiredModelTypes.some(
        type => !modelList.some(model => model?.type === type)
      );
      const lackAddr = !addr || !addr.address || addr.address.trim() === '';

      // 检查知识库
      const kbList = kbRes.items || [];
      // 如果有知识库且当前没有设置或者设置的kb_id无效，设置第一个知识库
      // 使用 getState() 获取最新的 kb_id，避免依赖项变化导致的无限循环
      const currentKbId = useConfigStore.getState().kb_id;
      if (kbList.length > 0 && kbList[0]?.id && currentKbId !== kbList[0].id) {
        setKbId(kbList[0].id);
      }

      setNeedModel(lackModel);
      setNeedAddress(lackAddr);
      setShowGuide(lackModel || lackAddr || kbList.length === 0);
      // 返回检查结果
      return { lackModel, lackAddr };
    } catch {
      // 网络或接口异常时，强制进入引导
      setNeedModel(true);
      setNeedAddress(true);
      setShowGuide(true);
      return { lackModel: true, lackAddr: true };
    }
  }, [setKbId]);

  useEffect(() => {
    if (user?.uid) {
      // 触发登录后的配置检查（异步状态更新），跳过此行的 effect-setState 规则
      // eslint-disable-next-line
      checkNecessaryConfigurations();
    }
  }, [user, checkNecessaryConfigurations]);

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
              // 设置滚动条轨道背景颜色为 transparent
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'transparent',
              },
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
          border: 'none',
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
            outline: 'none',
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Box sx={{ fontSize: 16, fontWeight: 600, mb: 2 }}>社区基础配置</Box>
              <Access
                // 在保存成功后，仅更新地址配置状态，不自动关闭弹窗
                onSaved={() => {
                  // 重新检查配置状态，仅更新状态，不关闭弹窗
                  // 弹窗只有在两个配置都完成时，通过【完成】按钮才能关闭
                  checkNecessaryConfigurations();
                }}
              />
            </Box>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2" sx={{ mb: 0 }}>
                  模型管理
                </Typography>
                <Link
                  sx={{ color: 'info.main', cursor: 'pointer', fontSize: '14px' }}
                  href="https://koalaqa.docs.baizhi.cloud/node/019951c1-1700-7e4e-a3a8-b6997d1e5eab"
                  target="_blank"
                >
                  文档
                  <LaunchIcon sx={{ fontSize: 14, ml: 0.5 }} />
                </Link>
              </Stack>
              <ModelManagementModal
                open={true}
                mandatory={true}
                onConfigured={() => {
                  // 重新检查配置状态，仅更新状态，不关闭弹窗
                  // 弹窗只有在两个配置都完成时，通过【完成】按钮才能关闭
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
