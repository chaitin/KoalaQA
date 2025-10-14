/**
 * Next.js 中间件
 * 处理请求级别的逻辑：认证、重定向、headers 等
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getPublicAccessStatus } from '@/utils/publicAccess';

// 需要认证的路由
const PROTECTED_ROUTES = [
  '/profile',
  '/settings',
  // 可以添加更多需要认证的路由
];

// 认证相关路由（已登录用户不应访问）
const AUTH_ROUTES = ['/login', '/register'];

// 可能受public_access控制的路由（首页和discuss页面）
const CONDITIONAL_PUBLIC_ROUTES = ['/', '/discuss'];

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


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // 获取认证 token
  const authToken = request.cookies.get('auth_token')?.value;
  
  // 简化的认证检查：只检查是否有有效的token
  const isAuthenticated = (() => {
    if (!authToken) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Middleware] No auth token found');
      }
      return false;
    }
    
    // 检查token是否为有效字符串且不为空
    const isValid = typeof authToken === 'string' && 
                   authToken.length > 0 && 
                   authToken !== 'null' && 
                   authToken !== 'undefined' &&
                   authToken !== '""' &&
                   authToken !== "''" &&
                   authToken.trim().length > 0;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] Token valid:', isValid, 'token length:', authToken.length);
    }
    
    return isValid;
  })();
  
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
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] Auth route detected:', pathname, 'isAuthenticated:', isAuthenticated);
    }
    
    if (isAuthenticated) {
      // 检查是否有重定向参数
      const redirectUrl = request.nextUrl.searchParams.get('redirect');
      if (process.env.NODE_ENV === 'development') {
        console.log('[Middleware] Redirecting authenticated user, redirectUrl:', redirectUrl);
      }
      
      if (redirectUrl && redirectUrl !== '/login' && redirectUrl !== '/register') {
        // 确保重定向URL是安全的，避免循环重定向
        try {
          const redirectUrlObj = new URL(redirectUrl, request.url);
          // 只允许重定向到同域名的路径
          if (redirectUrlObj.origin === request.nextUrl.origin) {
            return NextResponse.redirect(redirectUrlObj);
          }
        } catch (error) {
          // 如果重定向URL无效，忽略重定向参数
          console.warn('Invalid redirect URL:', redirectUrl);
        }
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 处理可能受public_access控制的路由（首页和discuss页面）
  if (matchRoute(pathname, CONDITIONAL_PUBLIC_ROUTES)) {
    // 如果用户已登录，直接允许访问
    if (isAuthenticated) {
      return NextResponse.next();
    }

    // 如果用户未登录，检查public_access状态
    try {
      const baseURL = process.env.TARGET || '';
      const publicAccess = await getPublicAccessStatus(baseURL, request);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[Middleware] Public access status:', publicAccess, 'for path:', pathname);
      }

      // 如果public_access为false，强制跳转到登录页面
      if (!publicAccess) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    } catch (error) {
      console.error('[Middleware] Error checking public access:', error);
      // 出错时默认要求登录
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
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

