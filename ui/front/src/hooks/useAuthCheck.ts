'use client';

import { ModelUserRole } from '@/api';
import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/components/authProvider';
import { useGuestActivation } from '@/components';

/**
 * 用于检查用户登录状态的 Hook
 * @returns 返回检查登录状态的函数
 */
export const useAuthCheck = () => {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const { openModal } = useGuestActivation();

  const isLoggedIn = !!user?.uid;
  const isGuest = user?.role === ModelUserRole.UserRoleGuest;

  const redirectToLogin = () => {
    const currentPath = window.location.pathname + window.location.search;
    const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
    router.push(loginUrl);
  };

  const guardGuest = () => {
    if (isGuest) {
      openModal();
      return false;
    }
    return true;
  };

  /**
   * 检查用户是否已登录，如果未登录则跳转到登录页
   * @param callback 登录后要执行的回调函数
   * @returns 如果已登录返回 true，未登录返回 false
   */
  const checkAuth = (callback?: () => void): boolean => {
    if (!isLoggedIn) {
      redirectToLogin();
      return false;
    }
    
    if (!guardGuest()) {
      return false;
    }
    
    if (callback) {
      callback();
    }
    return true;
  };

  /**
   * 异步版本的登录检查
   * @param callback 登录后要执行的异步回调函数
   */
  const checkAuthAsync = async (callback?: () => Promise<void>): Promise<boolean> => {
    if (!isLoggedIn) {
      redirectToLogin();
      return false;
    }

    if (!guardGuest()) {
      return false;
    }
    
    if (callback) {
      await callback();
    }
    return true;
  };

  return {
    checkAuth,
    checkAuthAsync,
    isLoggedIn,
    isGuest,
    user
  };
};