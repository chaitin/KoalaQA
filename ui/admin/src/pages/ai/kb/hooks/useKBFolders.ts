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
    }
  );

  return {
    folders: foldersData?.items || [],
    refreshFolders,
    foldersLoading,
  };
};

