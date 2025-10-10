import { Box, Grid2 as Grid, Stack } from '@mui/material';
import GroupTagManager from './component/Topic';
import Access from './component/Access';
import Webhook from './component/Webhook';
import LoginMethod from './component/LoginMethod';

const Settings = () => {
  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Grid container spacing={2} alignItems="flex-start">
        {/* 左侧：分组管理、人工坐席管理 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <GroupTagManager />
            {/* TODO: 人工坐席管理组件，后续可插入 */}
          </Stack>
        </Grid>
        {/* 右侧：登录注册、访问管理、通知管理 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <LoginMethod />
            <Access />
            <Webhook />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
