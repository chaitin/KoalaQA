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
  ];
  
  cookiesToClear.forEach(clearCookie);
}

// 保持向后兼容的异步函数
export async function clearCookieLegacy() {
  clearCookie('_pw_auth_session');
}
