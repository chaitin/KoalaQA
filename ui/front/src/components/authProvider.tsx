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
  const [loading, setLoading] = useState(!initialUser);
  const fetchingRef = useRef(false);

  // 使用 useCallback 优化函数引用
  const fetchUser = useCallback(async () => {
    console.log('[AuthProvider] fetchUser called');
    
    // 防止重复请求
    if (fetchingRef.current) {
      console.log('[AuthProvider] Already fetching, skipping');
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    
    try {
      console.log('[AuthProvider] Calling getUser API');
      // httpClient 现在内置了缓存和重试，直接调用即可
      const userData = await getUser();
      console.log('[AuthProvider] Got user data:', userData);
      setUser(userData);
    } catch (error) {
      // 如果是401错误，说明需要登录，但不在这里处理重定向
      // 重定向逻辑已经在httpClient中处理了
      console.error('[AuthProvider] Failed to fetch user:', error);
      setUser(EMPTY_USER);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    console.log('[AuthProvider] useEffect triggered:', { initialUser });
    
    // 如果已经有 initialUser，不需要再次请求
    if (initialUser) {
      console.log('[AuthProvider] Has initialUser, skipping fetch');
      return;
    }

    // 检查是否有 token，没有 token 则不请求
    const hasToken = safeClientExecute(() => {
      const localToken = localStorage.getItem('auth_token');
      const cookieToken = document.cookie.includes('auth_token');
      console.log('[AuthProvider] Token check:', { localToken, cookieToken });
      return localToken || cookieToken;
    }) || false;

    console.log('[AuthProvider] Has token:', hasToken);

    if (!hasToken) {
      console.log('[AuthProvider] No token, setting loading to false');
      setLoading(false);
      return;
    }

    console.log('[AuthProvider] Has token, fetching user');
    fetchUser();
  }, [initialUser, fetchUser]);

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
