/**
 * Next.js 中间件
 * 处理请求级别的逻辑：认证、重定向、headers 等
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要认证的路由
const PROTECTED_ROUTES = [
  '/profile',
  '/settings',
  // 可以添加更多需要认证的路由
];

// 认证相关路由（已登录用户不应访问）
const AUTH_ROUTES = ['/login', '/register'];

// 公开路由（不需要任何检查）
const PUBLIC_ROUTES = ['/', '/discuss'];

/**
 * 检查路由是否匹配
 */
function matchRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => {
    if (route === pathname) return true;
    if (route.endsWith('*')) {
      const prefix = route.slice(0, -1);
      return pathname.startsWith(prefix);
    }
    return false;
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 获取认证 token
  const authToken = request.cookies.get('auth_token')?.value;
  const isAuthenticated = !!authToken;
  
  // 跳过静态文件和 API 路由
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 处理需要认证的路由
  if (matchRoute(pathname, PROTECTED_ROUTES)) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 处理认证路由（已登录用户重定向到首页）
  if (matchRoute(pathname, AUTH_ROUTES)) {
    if (isAuthenticated) {
      // 检查是否有重定向参数
      const redirectUrl = request.nextUrl.searchParams.get('redirect');
      if (redirectUrl) {
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 添加安全 headers
  const response = NextResponse.next();
  
  // 安全 Headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  
  // CSP (Content Security Policy) - 根据需要调整
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );
  }

  return response;
}

// 配置匹配的路径
export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|font).*)',
  ],
};

