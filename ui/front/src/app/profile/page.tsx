import { getUser } from '@/api';
import { cookies } from 'next/headers';
import ProfileContent from './ui/ProfileContent';
import { Box } from '@mui/material';
import { Metadata } from 'next';

// 强制动态渲染，因为使用了 cookies
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '个人中心',
  description: '管理您的个人信息和账户设置',
};

async function getUserData() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return null;
    }

    const userData = await getUser();
    return userData || null;
  } catch (error) {
    return null;
  }
}

export default async function ProfilePage() {
  const user = await getUserData();

  if (!user) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: 18,
          color: '#666',
        }}
      >
        请先登录
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
      }}
    >
      <ProfileContent initialUser={user} />
    </Box>
  );
}