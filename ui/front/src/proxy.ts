/**
 * Next.js 16 Proxy
 * 处理请求级别的逻辑：认证、重定向、headers 等
 * 替代已弃用的middleware约定
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerPublicAccessStatus } from './utils/serverAuthConfig';
import { getForum } from './api';

// 需要认证的路由（当public_access为false时）
const PROTECTED_ROUTES = [
  '/profile',
  '/settings',
  // 可以添加更多需要认证的路由
];

// 认证相关路由（已登录用户不应访问）
const AUTH_ROUTES = ['/login', '/register'];

// 已知的非论坛路径，这些路径不应该被动态路由匹配逻辑处理
const KNOWN_NON_FORUM_PATHS = [
  '/login',
  '/register', 
  '/profile',
  '/settings',
  '/admin',
  '/api',
  '/_next',
  '/static',
  '/favicon.ico'
];

// 注意：现在使用 isProtectedPage() 函数来检查所有需要保护的页面
// 除了登录和注册页面外的所有页面都会受到保护

/**
 * 检查路径是否为已知的非论坛路径
 */
function isKnownNonForumPath(pathname: string): boolean {
  return KNOWN_NON_FORUM_PATHS.some(path => {
    if (pathname === path) return true;
    if (pathname.startsWith(path + '/')) return true;
    return false;
  });
}

/**
 * 验证路径是否为有效的论坛路由
 * 通过检查第一个路径段是否匹配某个论坛的 route_name
 */
async function isValidForumRoute(pathname: string): Promise<boolean> {
  try {
    // 获取路径段
    const pathSegments = pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0) return false;
    
    const firstSegment = pathSegments[0];
    
    // 如果是已知的非论坛路径，直接返回 false
    if (isKnownNonForumPath(`/${firstSegment}`)) {
      return false;
    }
    
    // 获取论坛数据
    const forums = await getForum();
    if (!forums || forums.length === 0) {
      return false;
    }
    
    // 检查第一个路径段是否匹配某个论坛的 route_name
    return forums.some(forum => forum.route_name === firstSegment);
  } catch (error) {
    console.error('[Proxy] Error validating forum route:', error);
    return false;
  }
}

/**
 * 调用后端接口校验 auth_token 是否仍然有效
 * 由于 cookie 可能早已失效但仍存在浏览器端，这里通过请求 /api/user 来确认
 */
async function validateAuthToken(request: NextRequest, baseURL?: string): Promise<boolean> {
  try {
    const targetOrigin = baseURL && baseURL.length > 0 ? baseURL : request.nextUrl.origin
    const verifyUrl = new URL('/api/user', targetOrigin)

    const response = await fetch(verifyUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        cookie: request.headers.get('cookie') ?? '',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return Boolean(data?.data?.uid)
  } catch (error) {
    console.warn('[Proxy] Failed to validate auth token:', error)
    return false
  }
}

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
    // 处理动态路由模式，如 [route_name]*
    if (route.includes('[') && route.includes(']') && route.endsWith('*')) {
      // 对于动态路由，我们检查路径是否匹配模式
      // 例如：/[route_name]* 应该匹配 /tech, /general 等
      const pathSegments = pathname.split('/').filter(Boolean);
      return pathSegments.length >= 1; // 至少有一个路径段
    }
    return false;
  });
}

/**
 * 检查是否为需要保护的页面（除了登录和注册页面外的所有页面）
 */
function isProtectedPage(pathname: string): boolean {
  // 排除登录和注册页面
  if (AUTH_ROUTES.includes(pathname)) {
    return false;
  }
  
  // 排除静态文件和API路由
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return false;
  }
  
  // 排除已知的非论坛路径
  if (isKnownNonForumPath(pathname)) {
    return false;
  }
  
  // 其他所有页面都需要保护
  return true;
}

/**
 * 检查是否为需要保护的页面（异步版本，用于验证论坛路由）
 */
async function isProtectedPageAsync(pathname: string): Promise<boolean> {
  // 排除登录和注册页面
  if (AUTH_ROUTES.includes(pathname)) {
    return false;
  }
  
  // 排除静态文件和API路由
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return false;
  }
  
  // 排除已知的非论坛路径
  if (isKnownNonForumPath(pathname)) {
    return false;
  }
  
  // 对于单段路径，验证是否为有效的论坛路由
  // 注意：这里不再因为不是有效论坛路由就排除保护
  // 因为当 public_access 为 false 时，所有非登录注册页面都应该被保护
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length === 1) {
    const isValidForum = await isValidForumRoute(pathname);
    // 如果是有效的论坛路由，需要保护
    // 如果不是有效的论坛路由，仍然需要保护（因为可能是其他需要认证的页面）
    // 只有在 public_access 为 true 时，才会允许访问无效的论坛路由
    return true;
  }
  
  // 其他所有页面都需要保护
  return true;
}


export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const baseURL = process.env.TARGET || request.nextUrl.origin;
  // 获取认证 token
  const authToken = request.cookies.get('auth_token')?.value;
  let shouldClearAuthCookie = false;
  const finalizeResponse = (response: NextResponse) => {
    if (shouldClearAuthCookie) {
      response.cookies.delete('auth_token');
    }
    return response;
  };
  
  // 简化的认证检查：先验证token格式，再视情况进行后端校验
  let isAuthenticated = false;
  if (authToken) {
    const isValidFormat =
      typeof authToken === 'string' &&
      authToken.length > 0 &&
      authToken !== 'null' &&
      authToken !== 'undefined' &&
      authToken !== '""' &&
      authToken !== "''" &&
      authToken.trim().length > 0;

    isAuthenticated = isValidFormat;
  }
  
  // 跳过静态文件和 API 路由
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return finalizeResponse(NextResponse.next());
  }

  // 处理认证路由（已登录用户重定向到首页）
  if (matchRoute(pathname, AUTH_ROUTES)) {
    if (isAuthenticated) {
      const tokenValid = await validateAuthToken(request, baseURL);
      if (!tokenValid) {
        isAuthenticated = false;
        shouldClearAuthCookie = true;
      }
    }

    if (isAuthenticated) {
      // 检查是否有重定向参数
      const redirectUrl = request.nextUrl.searchParams.get('redirect');
      
      if (redirectUrl && redirectUrl !== '/login' && redirectUrl !== '/register') {
        // 确保重定向URL是安全的，避免循环重定向
        try {
          const redirectUrlObj = new URL(redirectUrl, request.url);
          // 只允许重定向到同域名的路径
          if (redirectUrlObj.origin === request.nextUrl.origin) {
            return finalizeResponse(NextResponse.redirect(redirectUrlObj));
          }
        } catch {
          // 如果重定向URL无效，忽略重定向参数
          console.warn('Invalid redirect URL:', redirectUrl);
        }
      }
      
      // 检查是否是刚登录的情况（通过检查 Referer）
      const referer = request.headers.get('referer');
      const isFromLogin = referer && referer.includes('/login');
      
      // 如果是刚登录，给客户端一些时间处理跳转，不要立即重定向
      if (isFromLogin && pathname === '/login') {
        return finalizeResponse(NextResponse.next());
      }
      
      return finalizeResponse(NextResponse.redirect(new URL('/', request.url)));
    }
  }

  // 处理需要根据public_access状态进行访问控制的页面
  // 除了登录和注册页面外的所有页面都需要检查
  const shouldProtect = await isProtectedPageAsync(pathname);
  if (shouldProtect) {
    // 如果用户已登录，直接允许访问
    if (isAuthenticated) {
      return finalizeResponse(NextResponse.next());
    }

    // 如果用户未登录，检查public_access状态
    try {
      const publicAccess = await getServerPublicAccessStatus(baseURL, request);
      
      // 如果public_access为false，强制跳转到登录页面
      if (!publicAccess) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return finalizeResponse(NextResponse.redirect(loginUrl));
      }
      
      // 如果public_access为true，对于单段路径需要验证是否为有效论坛路由
      // 如果不是有效论坛路由，允许访问（让Next.js处理404）
      const pathSegments = pathname.split('/').filter(Boolean);
      if (pathSegments.length === 1) {
        const isValidForum = await isValidForumRoute(pathname);
        if (!isValidForum) {
          // 允许访问，让Next.js处理404页面
          return finalizeResponse(NextResponse.next());
        }
      }
    } catch (error) {
      console.error('[Middleware] Error checking public access:', error);
      // 出错时默认要求登录
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return finalizeResponse(NextResponse.redirect(loginUrl));
    }
  }

  // 处理需要认证的路由（当public_access为false时，这些路由总是需要登录）
  if (matchRoute(pathname, PROTECTED_ROUTES)) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return finalizeResponse(NextResponse.redirect(loginUrl));
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
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https: http:; media-src 'self' https:;"
    );
  }

  return finalizeResponse(response);
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
