import { getUser, getBot, getDiscussionAskSession, getSystemWebPlugin } from '@/api';
import { cookies } from 'next/headers';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
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

async function getSessionId(user: Awaited<ReturnType<typeof getUserData>>, urlId: string | null): Promise<string | null> {
  // 如果是游客状态（未登录）且当前 URL 中有 id，则直接使用 URL 中的 id
  if (!user && urlId) {
    return urlId;
  }

  // 否则调用 API 获取会话 ID
  try {
    const response = await getDiscussionAskSession({});
    return response || null;
  } catch (error) {
    console.error('获取会话ID失败:', error);
    return null;
  }
}

export default async function CustomerServicePage(props: {
  readonly searchParams: Promise<{ id?: string; is_widget?: string }>
}) {
  const searchParams = await props.searchParams;
  const urlId = searchParams?.id || null;
  const isWidget = searchParams?.is_widget === '1';

  const user = await getUserData();
  const [botData, sessionId, pluginConfig] = await Promise.all([
    getBotData(),
    getSessionId(user, urlId),
    getSystemWebPlugin().catch(() => null),
  ]);

  // 如果在线支持被禁用且不在 iframe 内（is_widget=1），触发 404
  if (pluginConfig && !pluginConfig.enabled && !isWidget) {
    notFound();
  }

  // 允许未登录用户访问，user 可以为 null
  return <CustomerServiceContent initialUser={user ?? undefined} botData={botData} initialSessionId={sessionId} />;
}
