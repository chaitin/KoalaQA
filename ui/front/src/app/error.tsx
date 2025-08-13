'use client';
import Link from 'next/link';
import Image from 'next/image';
import error from '@/asset/img/500.png';
import { Box, Stack, Button } from '@mui/material';

export default function Error() {
  return (
    <Box
      sx={{
        pt: 8,
        background: 'url(/bg.png) no-repeat top left / 100% auto',
        height: '100vh',
      }}
    >
      <Stack
        sx={{
          width: 1200,
          overflow: 'auto',
          height: 'calc(100vh - 64px)',
          pb: 6,
          mx: 'auto',
        }}
        gap={3}
        justifyContent='center'
        alignItems='center'
      >
        <Image src={error} alt='500'></Image>
        <Button component={Link} href='/' size='large'>
          返回首页
        </Button>
      </Stack>
    </Box>
  );
}
