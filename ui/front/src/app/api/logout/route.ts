import { NextRequest, NextResponse } from 'next/server';
import { clearAllAuthCookies } from '@/utils/cookie';

/**
 * 退出登录 API 路由
 * 处理 SSR 和客户端的 cookie 清理
 */
export async function POST(request: NextRequest) {
  try {
    // 创建响应
    const response = NextResponse.json(
      { success: true, message: '退出登录成功' },
      { status: 200 }
    );

    // 清除所有认证相关的 cookie
    const cookiesToClear = [
      'auth_token',
      'session_id', 
      'koala_session',
      'csrf_token',
      '_vercel_jwt',
      '_pw_auth_session',
    ];

    // 在服务端清除 cookie
    cookiesToClear.forEach(cookieName => {
      // 清除不同路径和域名的 cookie
      const paths = ['/', '/api'];
      const domains = [request.nextUrl.hostname];
      
      // 添加子域名（如果不是 localhost）
      if (request.nextUrl.hostname !== "localhost") {
        domains.push(`.${request.nextUrl.hostname}`);
      }

      paths.forEach(path => {
        domains.forEach(domain => {
          // 清除带域名的 cookie
          response.cookies.set(cookieName, '', {
            expires: new Date(0),
            path: path,
            domain: domain,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
          });
          
          // 清除不带域名的 cookie
          response.cookies.set(cookieName, '', {
            expires: new Date(0),
            path: path,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
          });
        });
      });
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[Logout API] Cleared all authentication cookies');
    }

    return response;
  } catch (error) {
    console.error('[Logout API] Error during logout:', error);
    return NextResponse.json(
      { success: false, message: '退出登录失败' },
      { status: 500 }
    );
  }
}

// 支持 GET 请求（用于直接访问）
export async function GET(request: NextRequest) {
  return POST(request);
}
