// 清除特定cookie的函数
export function clearCookie(name: string) {
  if (typeof window === 'undefined') {
    return;
  }
  
  const paths = ['/', window.location.pathname];
  const domains = [window.location.hostname];
  
  // 添加子域名
  if (window.location.hostname !== "localhost") {
    domains.push(`.${window.location.hostname}`);
  }
  
  // 清除不同路径和域名的cookie
  paths.forEach(path => {
    domains.forEach(domain => {
      // 清除带域名的cookie
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}; SameSite=Lax`;
      // 清除不带域名的cookie
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; SameSite=Lax`;
      // 清除Secure cookie（如果存在）
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}; SameSite=Lax; Secure`;
    });
  });
}

// 清除所有认证相关的cookie
export function clearAllAuthCookies() {
  const cookiesToClear = [
    "auth_token",
    "session_id", 
    "koala_session",
    "csrf_token",
    "_vercel_jwt",
    "_pw_auth_session",
    // 添加更多可能的认证相关cookie
    "access_token",
    "refresh_token",
    "jwt_token",
    "user_session",
    "auth_session",
  ];
  
  cookiesToClear.forEach(clearCookie);
  
  // 额外清理：尝试清理所有可能的cookie变体
  if (typeof window !== 'undefined') {
    // 获取当前页面的所有cookie
    const allCookies = document.cookie.split(';');
    allCookies.forEach(cookie => {
      const cookieName = cookie.split('=')[0].trim();
      // 如果cookie名称包含认证相关的关键词，也尝试清理
      if (cookieName.toLowerCase().includes('auth') || 
          cookieName.toLowerCase().includes('token') || 
          cookieName.toLowerCase().includes('session')) {
        clearCookie(cookieName);
      }
    });
  }
}

// 保持向后兼容的异步函数
export async function clearCookieLegacy() {
  clearCookie('_pw_auth_session');
}
