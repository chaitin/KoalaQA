import { getUser, getBot, getDiscussionAskSession, getSystemWebPlugin } from '@/api';
import { cookies } from 'next/headers';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
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

async function getSessionId(user: Awaited<ReturnType<typeof getUserData>>, urlId: string | null, question: string | null, isWidget: boolean): Promise<string | null> {
  // 在 widget 模式下，如果没有 urlId，不在服务端获取 sessionId
  // 而是让客户端组件自行处理，避免服务端重定向导致的页面闪烁
  if (isWidget && !urlId) {
    return null;
  }

  // 如果是游客状态（未登录）且当前 URL 中有 id，则直接使用 URL 中的 id
  if (!user && urlId) {
    return urlId;
  }

  // 否则调用 API 获取会话 ID
  try {
    // 只有在有问题且没有 URL ID 的情况下才强制创建新会话，避免重定向死循环
    const shouldForceCreate = question && !urlId;
    const response = await getDiscussionAskSession(shouldForceCreate ? { force_create: true } : {});
    return response || null;
  } catch (error) {
    console.error('获取会话ID失败:', error);
    return null;
  }
}

export default async function CustomerServicePage(props: {
  readonly searchParams: Promise<{ id?: string; is_widget?: string; question?: string }>
}) {
  const searchParams = await props.searchParams;
  const urlId = searchParams?.id || null;
  const question = searchParams?.question || null;
  const isWidget = searchParams?.is_widget === '1';

  const user = await getUserData();
  const [botData, sessionId, pluginConfig] = await Promise.all([
    getBotData(),
    getSessionId(user, urlId, question, isWidget),
    getSystemWebPlugin().catch(() => null),
  ]);

  // 如果获取到了新的 sessionId 且与 URL 中的 id 不一致，重定向到带有 id 的 URL
  // 这样可以确保 URL 始终包含当前的会话 ID
  // 但在 widget 模式下，为了避免 iframe 页面闪烁，不在服务端重定向，而是让客户端组件处理
  if (sessionId && sessionId !== urlId && !isWidget) {
    const newParams = new URLSearchParams();
    newParams.set('id', sessionId);

    if (question) {
      newParams.set('question', question);
    }

    redirect(`/customer-service?${newParams.toString()}`);
  }

  // 如果在线支持被禁用且不在 iframe 内（is_widget=1），触发 404
  if (pluginConfig && !pluginConfig.enabled && !isWidget) {
    notFound();
  }
  // 在非 widget 模式下，如果没有 sessionId，不渲染组件
  // 在 widget 模式下，允许 sessionId 为 null，客户端会自行获取
  if (!sessionId && !isWidget) {
    return null;
  }
  // 允许未登录用户访问，user 可以为 null
  return <CustomerServiceContent key={sessionId || 'init'} initialUser={user ?? undefined} botData={botData} sessionId={sessionId || ''} />;
}
