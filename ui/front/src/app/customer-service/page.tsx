import { getUser, getBot, getDiscussionAskSession } from '@/api';
import { cookies } from 'next/headers';
import { Box } from '@mui/material';
import { Metadata } from 'next';
import CustomerServiceContent from './ui/CustomerServiceContent';
import { SvcBotGetRes } from '@/api/types';

// 强制动态渲染，因为使用了 cookies
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '客服智能对话',
  description: '在线客服智能对话助手',
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

async function getBotData(): Promise<SvcBotGetRes | null> {
  try {
    const botData = await getBot();
    return botData || null;
  } catch (error) {
    console.error('获取机器人信息失败:', error);
    return null;
  }
}

async function getSessionId(): Promise<string | null> {
  try {
    const response = await getDiscussionAskSession({});
    return response || null;
  } catch (error) {
    console.error('获取会话ID失败:', error);
    return null;
  }
}

export default async function CustomerServicePage() {
  const [user, botData, sessionId] = await Promise.all([
    getUserData(),
    getBotData(),
    getSessionId(),
  ]);

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

  return <CustomerServiceContent initialUser={user} botData={botData} initialSessionId={sessionId} />;
}
