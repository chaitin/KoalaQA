import { useRequest } from 'ahooks';
import { useEffect } from 'react';
import { getAdminKbKbIdSpace } from '@/api';

export const useKBSpaces = (
  kbId: number,
  selectedSpaceId: number | null,
  setSelectedSpaceId: (id: number | null) => void,
  urlSpaceId: string | null
) => {
  const { data: spacesData, refresh: refreshSpaces } = useRequest(
    () => getAdminKbKbIdSpace({ kbId }),
    {
      onSuccess: data => {
        // 如果 URL 中有 spaceId，优先使用 URL 中的值
        if (urlSpaceId) {
          const spaceIdFromUrl = Number(urlSpaceId);
          if (!Number.isNaN(spaceIdFromUrl) && spaceIdFromUrl > 0) {
            // 验证 spaceId 是否存在于列表中
            const spaceExists = data?.items?.some(space => space.id === spaceIdFromUrl);
            if (spaceExists && selectedSpaceId !== spaceIdFromUrl) {
              setSelectedSpaceId(spaceIdFromUrl);
              return;
            }
          }
        }
        // 如果当前没有选中任何知识源，且有知识源数据，则默认选中第一个
        if (
          selectedSpaceId === null &&
          data?.items &&
          data.items.length > 0 &&
          data.items[0].id !== undefined
        ) {
          setSelectedSpaceId(data.items[0].id!);
        }
      },
    }
  );

  // 当 URL 中的 spaceId 变化时，更新选中状态
  useEffect(() => {
    if (urlSpaceId) {
      const spaceIdFromUrl = Number(urlSpaceId);
      if (
        !Number.isNaN(spaceIdFromUrl) &&
        spaceIdFromUrl > 0 &&
        selectedSpaceId !== spaceIdFromUrl
      ) {
        // 验证 spaceId 是否存在于列表中
        const spaceExists = spacesData?.items?.some(space => space.id === spaceIdFromUrl);
        if (spaceExists) {
          setSelectedSpaceId(spaceIdFromUrl);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSpaceId, spacesData]);

  return {
    spaces: spacesData?.items || [],
    refreshSpaces,
  };
};

