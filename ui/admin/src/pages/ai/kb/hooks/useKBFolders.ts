import { useRequest } from 'ahooks';
import { getAdminKbKbIdSpaceSpaceIdFolder } from '@/api';

export const useKBFolders = (kbId: number, selectedSpaceId: number | null) => {
  const {
    data: foldersData,
    refresh: refreshFolders,
    loading: foldersLoading,
  } = useRequest(
    () =>
      selectedSpaceId
        ? getAdminKbKbIdSpaceSpaceIdFolder({ kbId, spaceId: selectedSpaceId })
        : Promise.resolve(null),
    {
      refreshDeps: [selectedSpaceId],
      // 添加防抖，避免短时间内重复请求（当 selectedSpaceId 快速变化时）
      debounceWait: 100,
      // 只有当 selectedSpaceId 有效时才执行请求
      ready: !!selectedSpaceId,
    }
  );

  return {
    folders: foldersData?.items || [],
    refreshFolders,
    foldersLoading,
  };
};

