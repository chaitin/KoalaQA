'use client';

import { Box, Skeleton, Stack, CircularProgress, Typography } from '@mui/material';

const LoadingEditorWrap = () => {
  return (
    <Box sx={{ p: 3, height: '100%' }}>
      {/* 头部加载骨架 */}
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="rectangular" width="100%" height={60} />
      </Stack>

      {/* 工具栏加载骨架 */}
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} variant="rectangular" width={40} height={40} />
        ))}
      </Stack>

      {/* 内容区域加载骨架 */}
      <Stack spacing={2}>
        <Skeleton variant="text" width="80%" height={24} />
        <Skeleton variant="text" width="100%" height={24} />
        <Skeleton variant="text" width="90%" height={24} />
        <Skeleton variant="rectangular" width="100%" height={200} />
        <Skeleton variant="text" width="70%" height={24} />
        <Skeleton variant="text" width="85%" height={24} />
      </Stack>

      {/* 中央加载指示器 */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          正在加载编辑器...
        </Typography>
      </Box>
    </Box>
  );
};
      <Box>
        <Box
          sx={{
            p: '72px 72px 150px',
            mt: '102px',
            mx: 'auto',
            maxWidth: 892,
            minWidth: '386px',
          }}
        >
          <Stack direction={'row'} alignItems={'center'} gap={1} sx={{ mb: 2 }}>
            <Skeleton variant='text' width={36} height={36} />
            <Skeleton variant='text' width={300} height={36} />
          </Stack>
          <Stack direction={'row'} alignItems={'center'} gap={2} sx={{ mb: 4 }}>
            <Stack direction={'row'} alignItems={'center'} gap={0.5}>
              <Icon type='icon-a-shijian2' sx={{ color: 'text.tertiary' }} />
              <Skeleton variant='text' width={130} height={24} />
            </Stack>
            <Stack direction={'row'} alignItems={'center'} gap={0.5}>
              <Icon type='icon-ziti' sx={{ color: 'text.tertiary' }} />
              <Skeleton variant='text' width={80} height={24} />
            </Stack>
          </Stack>
          <Stack
            gap={1}
            sx={{
              minHeight: 'calc(100vh - 432px)',
            }}
          >
            <Skeleton variant='text' height={24} />
            <Skeleton variant='text' width={300} height={24} />
            <Skeleton variant='text' height={24} />
            <Skeleton variant='text' height={24} />
            <Skeleton variant='text' width={600} height={24} />
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default LoadingEditorWrap;
