import { useRequest } from 'ahooks';
import { useEffect, useRef, useMemo } from 'react';
import { getAdminKbKbIdSpace } from '@/api';

export const useKBSpaces = (
  kbId: number,
  selectedSpaceId: number | null,
  setSelectedSpaceId: (id: number | null) => void,
  urlSpaceId: string | null
) => {
  // 使用 useRef 存储最新的 spacesData，避免依赖对象引用导致无限循环
  const spacesDataRef = useRef<any>(null);
  // 使用字符串化的 IDs 来追踪数据是否真正变化
  const spacesIdsStringRef = useRef<string>('');
  // 追踪是否已经处理过初始设置，避免重复设置导致循环
  const initializedRef = useRef<boolean>(false);
  // 追踪上一次的 selectedSpaceId，避免重复设置相同的值
  const lastSelectedSpaceIdRef = useRef<number | null>(null);
  // 使用 ref 存储最新的 urlSpaceId 和 selectedSpaceId，避免闭包问题
  const urlSpaceIdRef = useRef<string | null>(urlSpaceId);
  const selectedSpaceIdRef = useRef<number | null>(selectedSpaceId);

  // 同步最新的值到 ref
  useEffect(() => {
    urlSpaceIdRef.current = urlSpaceId;
  }, [urlSpaceId]);
  
  useEffect(() => {
    selectedSpaceIdRef.current = selectedSpaceId;
    lastSelectedSpaceIdRef.current = selectedSpaceId;
  }, [selectedSpaceId]);

  const { data: spacesData, refresh: refreshSpaces } = useRequest(
    () => getAdminKbKbIdSpace({ kbId }),
    {
      refreshDeps: [kbId],
      // 添加防抖，避免短时间内重复请求
      debounceWait: 100,
      onSuccess: data => {
        // 使用 ref 中的最新值，而不是闭包中的值
        const currentUrlSpaceId = urlSpaceIdRef.current;
        const currentSelectedSpaceId = selectedSpaceIdRef.current;
        
        // 比较数据内容是否真正变化（通过序列化 IDs 来判断）
        const currentIdsString = data?.items?.map((item: any) => item.id).join(',') || '';
        const dataChanged = spacesIdsStringRef.current !== currentIdsString;
        
        // 只有数据内容真正变化时才更新引用，避免触发依赖该引用的 useEffect
        if (dataChanged) {
          spacesDataRef.current = data;
          spacesIdsStringRef.current = currentIdsString;
          // 数据变化时，重置初始化标志，允许重新处理
          initializedRef.current = false;
        }

        // 如果已经初始化过且数据未变化，跳过后续处理，避免重复设置
        if (initializedRef.current && !dataChanged) {
          return;
        }

        // 如果 URL 中有 spaceId，优先使用 URL 中的值
        if (currentUrlSpaceId) {
          const spaceIdFromUrl = Number(currentUrlSpaceId);
          if (!Number.isNaN(spaceIdFromUrl) && spaceIdFromUrl > 0) {
            // 验证 spaceId 是否存在于列表中
            const spaceExists = data?.items?.some((space: any) => space.id === spaceIdFromUrl);
            if (spaceExists && currentSelectedSpaceId !== spaceIdFromUrl && lastSelectedSpaceIdRef.current !== spaceIdFromUrl) {
              lastSelectedSpaceIdRef.current = spaceIdFromUrl;
              setSelectedSpaceId(spaceIdFromUrl);
              initializedRef.current = true;
              return;
            }
          }
        }
        
        // 如果当前没有选中任何知识源，且有知识源数据，则默认选中第一个（只在数据变化或首次加载时执行）
        if (
          currentSelectedSpaceId === null &&
          data?.items &&
          data.items.length > 0 &&
          data.items[0]?.id !== undefined &&
          lastSelectedSpaceIdRef.current !== data.items[0].id
        ) {
          lastSelectedSpaceIdRef.current = data.items[0].id;
          setSelectedSpaceId(data.items[0].id);
          initializedRef.current = true;
        } else if (currentSelectedSpaceId !== null) {
          // 如果已经有选中的 spaceId，标记为已初始化
          initializedRef.current = true;
          lastSelectedSpaceIdRef.current = currentSelectedSpaceId;
        }
      },
    }
  );

  // 同步最新的 spacesData 到 ref，并计算稳定的 ID 字符串用于依赖
  const spacesIdsString = useMemo(() => {
    const currentIdsString = spacesData?.items?.map((item: any) => item.id).join(',') || '';
    if (spacesIdsStringRef.current !== currentIdsString) {
      spacesDataRef.current = spacesData;
      spacesIdsStringRef.current = currentIdsString;
    }
    return currentIdsString;
  }, [spacesData]);

  // 使用 useMemo 稳定 spaces 数组的引用
  // 只依赖 spacesIdsString（序列化后的 IDs），只有当 IDs 真正变化时才更新
  // 这样可以避免因 spacesData 对象引用变化导致不必要的重新渲染
  const spaces = useMemo(() => {
    return spacesData?.items || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spacesIdsString]);

  // 当 URL 中的 spaceId 变化时，更新选中状态
  // 只依赖 urlSpaceId 和 selectedSpaceId，不依赖 spacesData 对象引用
  useEffect(() => {
    if (!urlSpaceId) return;
    
    const spaceIdFromUrl = Number(urlSpaceId);
    if (
      Number.isNaN(spaceIdFromUrl) ||
      spaceIdFromUrl <= 0 ||
      selectedSpaceId === spaceIdFromUrl ||
      lastSelectedSpaceIdRef.current === spaceIdFromUrl
    ) {
      return;
    }

    // 使用 ref 中存储的最新数据，避免依赖对象引用
    // 只有在 spacesIdsString 变化时（即数据真正更新时）才检查
    const currentSpaces = spacesDataRef.current?.items || spacesData?.items || [];
    const spaceExists = currentSpaces.some((space: any) => space.id === spaceIdFromUrl);
    
    if (spaceExists) {
      lastSelectedSpaceIdRef.current = spaceIdFromUrl;
      setSelectedSpaceId(spaceIdFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSpaceId, selectedSpaceId, spacesIdsString]);

  return {
    spaces,
    refreshSpaces,
  };
};
