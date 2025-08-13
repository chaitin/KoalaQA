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

export default async function RootLayout(props: { children: React.ReactNode }) {
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
                    CssBaseline kickstart an elegant, consistent, and simple baseline to build upon.
                    <CssBaseline />
                    <Header />
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
