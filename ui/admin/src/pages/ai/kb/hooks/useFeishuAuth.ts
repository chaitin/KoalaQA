import { useState, useRef, useEffect } from 'react';
import { message } from '@ctzhian/ui';
import { getAdminKbDocumentFeishuUser, postAdminKbDocumentFeishuAuthUrl } from '@/api/Document';
import { AdminDocUserRes } from '@/api/types';

export const useFeishuAuth = (kbId: number, editSpaceId?: number) => {
  const [feishuBoundUser, setFeishuBoundUser] = useState<AdminDocUserRes | null>(null);
  const [needsRebind, setNeedsRebind] = useState(false);
  const originalAppIdRef = useRef<string>('');
  const originalSecretRef = useRef<string>('');

  // 监听 app_id 和 secret 的变化
  const checkRebindStatus = (appId: string, secret: string, userThirdId: string) => {
    if (userThirdId) {
      const hasChanged = Boolean(
        (originalAppIdRef.current && appId !== originalAppIdRef.current) ||
          (originalSecretRef.current && secret !== originalSecretRef.current)
      );
      setNeedsRebind(hasChanged);
    } else {
      setNeedsRebind(false);
    }
  };

  // 绑定飞书账号
  const handleBindFeishuAccount = async (
    appId: string,
    secret: string,
    name: string
  ): Promise<void> => {
    if (!appId || !secret) {
      message.warning('请先填写 Client ID 和 Client Secret');
      return;
    }

    // 在绑定前保存原始的 app_id 和 secret
    originalAppIdRef.current = appId;
    originalSecretRef.current = secret;
    setNeedsRebind(false);

    try {
      const response = await postAdminKbDocumentFeishuAuthUrl({
        name: name || '',
        client_id: appId,
        client_secret: secret,
        id: editSpaceId,
        kb_id: kbId,
      });

      if (response) {
        // 跳转到授权页面
        window.location.href = response;
      }
    } catch (error) {
      console.error('获取授权URL失败:', error);
      message.error('获取授权URL失败，请检查配置是否正确');
    }
  };

  // 解除绑定飞书账号
  const handleUnbindFeishuAccount = (setValue: any): void => {
    if (editSpaceId) {
      setFeishuBoundUser(null);
      setValue('user_third_id', '');
      setValue('username', '');
    } else {
      setFeishuBoundUser(null);
      message.success('已解除绑定，保存时需要重新绑定账号');
    }
    // 清除原始值和重新绑定标记
    originalAppIdRef.current = '';
    originalSecretRef.current = '';
    setNeedsRebind(false);
  };

  // 检查飞书绑定用户
  const checkFeishuBoundUser = async () => {
    try {
      const response = await getAdminKbDocumentFeishuUser();
      if (response) {
        setFeishuBoundUser(response);
        // 保存原始的 app_id 和 secret
        originalAppIdRef.current = response.client_id || '';
        originalSecretRef.current = response.client_secret || '';
        return response;
      }
    } catch (error) {
      console.error('获取飞书用户信息失败:', error);
    }
    return null;
  };

  return {
    feishuBoundUser,
    setFeishuBoundUser,
    needsRebind,
    setNeedsRebind,
    originalAppIdRef,
    originalSecretRef,
    checkRebindStatus,
    handleBindFeishuAccount,
    handleUnbindFeishuAccount,
    checkFeishuBoundUser,
  };
};

