import '@/asset/styles/common.css';
import '@/asset/styles/markdown.css';
import { AuthProvider, CommonProvider } from '@/components';
import theme from '@/theme';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import * as React from 'react';
import 'react-markdown-editor-lite/lib/index.css';
import { cookies } from 'next/headers';
import { getUser } from '@/api';

import Header from '../components/header';
import Scroll from './scroll';

const monoFont = localFont({
  src: '../asset/font/Mono.ttf',
  variable: '--font-mono',
});
const alimamashuheitiFont = localFont({
  src: '../asset/font/AlimamaShuHeiTi-Bold.ttf',
  variable: '--font-alimamashuheiti',
});

export const metadata: Metadata = {
  title: '',
  description:
    '',
  keywords: [
    '',
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

async function getUserData() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return null;
    }

    // 使用getUser API，httpClient会自动处理cookie转发
    const userData = await getUser();
    return userData || null;
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    return null;
  }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const user = await getUserData();

  return (
    <html lang='zh-CN'>
      <meta httpEquiv='content-language' content='zh-CN'></meta>

      <body className={monoFont.variable + ' ' + alimamashuheitiFont.variable}>
        <AntdRegistry>
          <ConfigProvider
            locale={zhCN}
            theme={{
              token: {
                colorPrimary: '#21222D',
              },
              components: {
                Input: {
                  borderRadius: 4,
                },
                Select: {
                  borderRadius: 4,
                },
              },
            }}
          >
            <CommonProvider>
              <AuthProvider>
                <AppRouterCacheProvider>
                  <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <Header initialUser={user} />
                    {props.children}
                    <Scroll />
                  </ThemeProvider>
                </AppRouterCacheProvider>
              </AuthProvider>
            </CommonProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
