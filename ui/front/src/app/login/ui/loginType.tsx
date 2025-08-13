'use client';

import { Card } from '@/components';
import { Box, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { Suspense } from 'react';
import Account from './account';

const LoginType = () => {
  return (
    <Suspense>
      <Card
        sx={{
          display: 'flex',
          top: 'calc(50% - 222px)',
          left: '50%',
          transform: 'translateX(-50%)',
          position: 'absolute',
          width: 494,
          p: 5,
        }}
      >
        <Stack
          sx={{
            pl: 5,
            flex: 1,
            '.ant-tabs-tab-btn': {
              fontSize: 18,
              mt: '-12px',
            },
            '.ant-tabs-nav': {
              marginBottom: '40px !important',
            },
            '.ant-tabs-nav::before': {
              borderBottom: 'none !important',
            },
          }}
          spacing={3}
        >
          <Typography
            variant='h1'
            sx={{ fontSize: '24px', mt: '52px', fontWeight: 600, mb: '9px' }}
          >
            账号登录
          </Typography>
          <Account isChecked={true} />
          <Stack
            alignItems='center'
            justifyContent='space-between'
            sx={{ mt: 2, color: 'rgba(0,0,0,0.3)', fontSize: 14 }}
          >
            <Box sx={{ mt: 1.5 }}>
              还没有注册？
              <Box
                component={Link}
                href='/register'
                sx={{ color: 'primary.main' }}
              >
                立即注册
              </Box>
            </Box>
          </Stack>
        </Stack>
      </Card>
    </Suspense>
  );
};

export default LoginType;
