// VSCode 授权和深度链接工具函数

export interface VSCodeAuthToken {
  token: string;
  userId: string;
  permissions: string[];
  expiresAt: number;
  createdAt: number;
}

export interface VSCodeConfig {
  extensionId?: string;
  redirectUri?: string;
  scope?: string[];
}

/**
 * 生成 VSCode 授权令牌
 */
export const generateVSCodeAuthToken = (
  userId: string,
  permissions: string[] = ['read', 'write']
): VSCodeAuthToken => {
  const now = Date.now();
  const token = btoa(
    JSON.stringify({
      userId,
      permissions,
      timestamp: now,
      random: Math.random().toString(36).substring(7),
    })
  );

  return {
    token,
    userId,
    permissions,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24小时后过期
    createdAt: now,
  };
};

/**
 * 验证授权令牌是否有效
 */
export const validateAuthToken = (authToken: VSCodeAuthToken): boolean => {
  const now = Date.now();
  return authToken.expiresAt > now;
};

/**
 * 打开 VSCode 并传递授权信息
 */
export const openVSCodeWithAuth = (
  authToken: VSCodeAuthToken,
  config: VSCodeConfig = {}
): void => {
  const {
    extensionId = 'monkey-code-extension',
    redirectUri = 'vscode://monkey-code.auth',
    scope = authToken.permissions,
  } = config;

  // 构建 VSCode URI scheme
  const params = new URLSearchParams({
    token: authToken.token,
    userId: authToken.userId,
    permissions: scope.join(','),
    expires: authToken.expiresAt.toString(),
    source: 'web-auth',
  });

  const vscodeUri = `${redirectUri}?${params.toString()}`;

  try {
    // 尝试打开 VSCode
    window.location.href = vscodeUri;

    // 记录授权日志
    console.log('VSCode 授权信息已发送:', {
      uri: vscodeUri,
      token: authToken.token,
      permissions: authToken.permissions,
    });
  } catch (error) {
    console.error('打开 VSCode 失败:', error);
    throw new Error('无法打开 VSCode，请确保已安装 VSCode');
  }
};

/**
 * 检查是否安装了 VSCode
 */
export const checkVSCodeInstalled = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // 创建一个临时链接来测试 VSCode 是否可用
    const testUri = 'vscode://';
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = testUri;

    let resolved = false;

    // 设置超时
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        document.body.removeChild(iframe);
        resolve(false);
      }
    }, 2000);

    // 如果成功加载，说明 VSCode 已安装
    iframe.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        document.body.removeChild(iframe);
        resolve(true);
      }
    };

    document.body.appendChild(iframe);
  });
};

/**
 * 获取 VSCode 下载链接
 */
export const getVSCodeDownloadUrl = (): string => {
  const platform = navigator.platform.toLowerCase();

  if (platform.includes('mac')) {
    return 'https://code.visualstudio.com/download#mac';
  } else if (platform.includes('win')) {
    return 'https://code.visualstudio.com/download#windows';
  } else {
    return 'https://code.visualstudio.com/download#linux';
  }
};

/**
 * 存储授权信息到本地存储
 */
export const storeAuthToken = (authToken: VSCodeAuthToken): void => {
  try {
    localStorage.setItem('vscode_auth_token', JSON.stringify(authToken));
    localStorage.setItem('vscode_auth_expires', authToken.expiresAt.toString());
  } catch (error) {
    console.error('存储授权令牌失败:', error);
  }
};

/**
 * 从本地存储获取授权信息
 */
export const getStoredAuthToken = (): VSCodeAuthToken | null => {
  try {
    const stored = localStorage.getItem('vscode_auth_token');
    if (!stored) return null;

    const authToken = JSON.parse(stored) as VSCodeAuthToken;

    // 检查是否过期
    if (!validateAuthToken(authToken)) {
      clearStoredAuthToken();
      return null;
    }

    return authToken;
  } catch (error) {
    console.error('获取存储的授权令牌失败:', error);
    return null;
  }
};

/**
 * 清除存储的授权信息
 */
export const clearStoredAuthToken = (): void => {
  try {
    localStorage.removeItem('vscode_auth_token');
    localStorage.removeItem('vscode_auth_expires');
  } catch (error) {
    console.error('清除授权令牌失败:', error);
  }
};

/**
 * 创建授权成功的回调处理
 */
export const createAuthCallback = (
  onSuccess?: (token: VSCodeAuthToken) => void,
  onError?: (error: Error) => void
) => {
  return {
    success: (authToken: VSCodeAuthToken) => {
      storeAuthToken(authToken);
      onSuccess?.(authToken);
    },
    error: (error: Error) => {
      console.error('VSCode 授权失败:', error);
      onError?.(error);
    },
  };
};

/**
 * 生成插件配置信息
 */
export const generatePluginConfig = (authToken: VSCodeAuthToken) => {
  return {
    apiEndpoint: window.location.origin + '/api',
    authToken: authToken.token,
    userId: authToken.userId,
    permissions: authToken.permissions,
    version: '1.0.0',
    supportedFeatures: [
      'code-completion',
      'error-detection',
      'refactoring',
      'documentation',
    ],
  };
};
