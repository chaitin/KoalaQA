'use client';

import { ModelUserInfo, ModelUserRole, getUser } from '@/api';
import { useLocalStorageState } from 'ahooks';
import { createContext, useEffect, useState } from 'react';

export const AuthContext = createContext({} as any);


export const encodeUrl = (url: string) => {
  const d = new URL(url);
  return d.pathname + d.search + d.hash;
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token,] = useLocalStorageState<string>('token', {
    defaultValue: '',
  });
  const [user, setUser] = useState<{
    token: string;
    user: ModelUserInfo;
  }>({
    token: '',
    user: {
      email: '',
      role: ModelUserRole.UserRoleUnknown,
      uid: 0,
      username: '',
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getUser()
      .then((res) => {
        setUser((pre) => ({ user: res, token: token || pre.token }));
      })
      .catch(() => {
        // redirectToLogin();
      })
      .finally(() => setLoading(false));
  }, []);
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
