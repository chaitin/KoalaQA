'use client';

import { ModelUserInfo, ModelUserRole, getUser } from '@/api';
import { createContext, useEffect, useState } from 'react';

export const AuthContext = createContext<{
  user: ModelUserInfo;
  loading: boolean;
  fetchUser: () => Promise<any>;
  setUser: React.Dispatch<React.SetStateAction<ModelUserInfo>>;
}>({
  user: {
    email: '',
    role: ModelUserRole.UserRoleUnknown,
    uid: 0,
    username: '',
  },
  loading: false,
  setUser: () => {},
  fetchUser: () => Promise.resolve(),
});

export const encodeUrl = (url: string) => {
  const d = new URL(url);
  return d.pathname + d.search + d.hash;
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<ModelUserInfo>({
    email: '',
    role: ModelUserRole.UserRoleUnknown,
    uid: 0,
    username: '',
  });
  const [loading, setLoading] = useState(true);
  const fetchUser = () => {
    setLoading(true);
    return getUser()
      .then(setUser)
      .catch((error) => {
        // 如果是401错误，说明需要登录，但不在这里处理重定向
        // 重定向逻辑已经在httpClient中处理了
        console.log('User not authenticated:', error);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    fetchUser()
  }, []);
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
