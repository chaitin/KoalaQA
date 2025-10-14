/**
 * 公共访问状态管理工具
 * 统一处理 public_access 状态的获取和缓存
 */

// 公共访问状态缓存
let publicAccessCache: boolean | null = null;
let publicAccessPromise: Promise<boolean> | null = null;

/**
 * 获取公共访问状态
 * @param baseURL 基础URL，用于构建API请求
 * @param request 可选的NextRequest对象，用于middleware环境
 * @returns Promise<boolean> public_access状态
 */
export const getPublicAccessStatus = async (
  baseURL: string = '',
  request?: any
): Promise<boolean> => {
  // 如果已经有缓存的状态，直接返回
  if (publicAccessCache !== null) {
    return publicAccessCache;
  }

  // 如果正在获取状态，等待现有的请求
  if (publicAccessPromise) {
    return publicAccessPromise;
  }

  // 创建新的获取状态的Promise
  publicAccessPromise = new Promise(async (resolve) => {
    try {
      let publicAccess = false;
      
      if (request) {
        // Middleware环境：使用fetch
        const apiUrl = `${baseURL}/api/user/login_method`;
        const fullUrl = new URL(apiUrl, request.url);
        const response = await fetch(fullUrl.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn('Failed to fetch public access status:', response.status);
          publicAccess = false;
        } else {
          const data = await response.json();
          publicAccess = data?.data?.public_access ?? false;
        }
      } else {
        // 客户端环境：不直接调用API，返回false让调用方决定
        // 这样可以避免与loginType.tsx中的getUserLoginMethod()重复请求
        publicAccess = false;
      }

      publicAccessCache = publicAccess;
      resolve(publicAccess);
    } catch (error) {
      console.error('Failed to fetch public access status:', error);
      // 默认返回false，要求登录
      publicAccessCache = false;
      resolve(false);
    } finally {
      // 清除Promise缓存，允许重试
      publicAccessPromise = null;
    }
  });

  return publicAccessPromise;
};

/**
 * 清除公共访问状态缓存的函数
 */
export const clearPublicAccessCache = () => {
  publicAccessCache = null;
  publicAccessPromise = null;
};

/**
 * 检查公共访问状态的便捷函数
 * 保持向后兼容性
 */
export const checkPublicAccess = getPublicAccessStatus;