'use client';

import { ModelUserInfo, ModelUserRole, getUser } from '@/api';
import { createContext, useEffect, useState, useCallback, useRef } from 'react';
// 简单的客户端检查函数
const isClient = typeof window !== 'undefined';
const safeClientExecute = <T,>(fn: () => T): T | null => {
  if (!isClient) return null;
  try {
    return fn();
  } catch {
    return null;
  }
};

const EMPTY_USER: ModelUserInfo = {
  email: '',
  role: ModelUserRole.UserRoleUnknown,
  uid: 0,
  username: '',
};

export const AuthContext = createContext<{
  user: ModelUserInfo;
  loading: boolean;
  fetchUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<ModelUserInfo>>;
  isAuthenticated: boolean;
}>({
  user: EMPTY_USER,
  loading: false,
  setUser: () => {},
  fetchUser: () => Promise.resolve(),
  isAuthenticated: false,
});

export const encodeUrl = (url: string) => {
  const d = new URL(url);
  return d.pathname + d.search + d.hash;
};

const AuthProvider = ({ 
  children,
  initialUser = null 
}: { 
  children: React.ReactNode;
  initialUser?: ModelUserInfo | null;
}) => {
  // 使用 initialUser 避免客户端重复请求
  const [user, setUser] = useState<ModelUserInfo>(initialUser || EMPTY_USER);
  const [loading, setLoading] = useState(false); // 固定初始值为false，避免hydration不匹配
  const fetchingRef = useRef(false);

  // 使用 useCallback 优化函数引用
  const fetchUser = useCallback(async () => {
    // 防止重复请求
    if (fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    
    try {
      // httpClient 现在内置了缓存和重试，直接调用即可
      const userData = await getUser();
      setUser(userData);
    } catch (error) {
      // 如果是401错误，说明需要登录，但不在这里处理重定向
      // 重定向逻辑已经在httpClient中处理了
      setUser(EMPTY_USER);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // 如果已经有 initialUser，不需要再次请求
    if (initialUser) {
      return;
    }

    // 检查是否有有效的 token，没有有效 token 则不请求
    const hasValidToken = safeClientExecute(() => {
      const localToken = localStorage.getItem('auth_token');
      const cookieToken = document.cookie.includes('auth_token');
      
      // 如果 token 存在但为空字符串、null 或 "null"，视为无效
      if (localToken === '' || localToken === '""' || localToken === 'null' || localToken === null) {
        return false;
      }
      
      return (localToken && localToken !== '""') || cookieToken;
    }) || false;

    if (!hasValidToken) {
      setLoading(false);
      return;
    }

    fetchUser();
  }, [initialUser, fetchUser]);

  // 监听认证清除事件
  useEffect(() => {
    const handleAuthCleared = () => {
      setUser(EMPTY_USER);
      setLoading(false);
      fetchingRef.current = false;
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:cleared', handleAuthCleared);
      return () => {
        window.removeEventListener('auth:cleared', handleAuthCleared);
      };
    }
  }, []);

  const isAuthenticated = (user?.uid ?? 0) > 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser,
        fetchUser,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
