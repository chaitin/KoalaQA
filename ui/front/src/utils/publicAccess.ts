import { checkPublicAccess } from '@/api/httpClient';

/**
 * 检查是否启用了公共访问模式
 * @returns Promise<boolean> 返回是否启用公共访问
 */
export const isPublicAccessEnabled = async (): Promise<boolean> => {
  try {
    return await checkPublicAccess();
  } catch (error) {
    console.error('Failed to check public access status:', error);
    return false;
  }
};

/**
 * 在需要认证的操作前检查公共访问状态
 * @param callback 需要认证的回调函数
 * @param fallback 公共访问模式下的回调函数（可选）
 */
export const withAuthCheck = async (
  callback: () => void | Promise<void>,
  fallback?: () => void | Promise<void>
) => {
  const publicAccess = await isPublicAccessEnabled();
  
  if (publicAccess && fallback) {
    // 公共访问模式下执行fallback
    await fallback();
  } else if (!publicAccess) {
    // 非公共访问模式下执行正常的认证流程
    await callback();
  }
  // 如果是公共访问模式但没有fallback，则什么都不做
};