import { Card } from '@/components';
import { Button, Typography } from '@mui/material';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '注册功能已关闭',
};

export default function RegisterNotFoundPage() {
  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        top: 'calc(50% - 200px)',
        left: '50%',
        transform: 'translateX(-50%)',
        position: 'absolute',
        width: 400,
        p: 4,
      }}
    >
      <Typography
        variant='h1'
        sx={{
          fontSize: '48px',
          fontWeight: 600,
          color: '#666',
          mb: 2,
        }}
      >
        404
      </Typography>
      
      <Typography
        variant='h2'
        sx={{
          fontSize: '24px',
          fontWeight: 600,
          color: '#333',
          mb: 2,
          textAlign: 'center',
        }}
      >
        注册功能已关闭
      </Typography>
      
      <Typography
        sx={{
          fontSize: '16px',
          color: '#666',
          mb: 4,
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        管理员已禁用用户注册功能。
        <br />
        如需账号，请联系管理员。
      </Typography>
      
      <Link href='/login' style={{ textDecoration: 'none' }}>
        <Button
          variant='contained'
          sx={{
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          返回登录
        </Button>
      </Link>
    </Card>
  );
}