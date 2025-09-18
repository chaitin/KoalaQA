import { getUser } from '@/api';
import { cookies } from 'next/headers';
import ProfileContent from './ui/ProfileContent';
import { Box } from '@mui/material';
import { Metadata } from 'next';

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
    console.error('Failed to fetch user data:', error);
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
        backgroundColor: '#f5f5f5',
        pt: 11, // 为header留出空间
      }}
    >
      <ProfileContent initialUser={user} />
    </Box>
  );
}