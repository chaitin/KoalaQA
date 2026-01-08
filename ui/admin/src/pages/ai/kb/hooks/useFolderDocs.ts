import { useRequest } from 'ahooks';
import { useRef, useEffect } from 'react';
import { getAdminKbKbIdSpaceSpaceIdFolderFolderIdDoc, SvcListSpaceFolderItem } from '@/api';

export const useFolderDocs = (kbId: number, selectedSpaceId: number | null) => {
  const lastFolderDocDataRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingFolderRef = useRef<SvcListSpaceFolderItem | null>(null);
  const pollingSpaceIdRef = useRef<number | null>(null);

  const { data: folderDocListData, run: fetchFolderDocList, mutate } = useRequest(
    (folder?: SvcListSpaceFolderItem | null) => {
      console.log('API调用开始，folder:', folder, 'selectedSpaceId:', selectedSpaceId);
      if (!selectedSpaceId) {
        console.log('selectedSpaceId为空，跳过API调用');
        return Promise.resolve(null);
      }
      if (!folder?.id) {
        console.log('folder.id为空，跳过API调用');
        return Promise.resolve(null);
      }
      return getAdminKbKbIdSpaceSpaceIdFolderFolderIdDoc({
        kbId,
        spaceId: selectedSpaceId,
        folderId: String(folder.id),
        page: 1,
        size: 9999999,
        parent_id: 0,
      });
    },
    {
      manual: true,
      onSuccess: (response: any) => {
        // 比较新旧数据，只有数据真正变化时才更新
        if (
          lastFolderDocDataRef.current &&
          response &&
          JSON.stringify(lastFolderDocDataRef.current) === JSON.stringify(response)
        ) {
          console.log('数据未变化，跳过状态更新');
          return;
        }
        console.log('数据发生变化，更新状态');
        lastFolderDocDataRef.current = response;
      },
    }
  );

  // 启动轮询
  const startPolling = () => {
    console.log('启动轮询');
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = setInterval(() => {
      console.log(
        '轮询执行中，pollingFolderRef:',
        pollingFolderRef.current,
        'pollingSpaceIdRef:',
        pollingSpaceIdRef.current
      );
      if (pollingFolderRef.current && pollingSpaceIdRef.current) {
        console.log('执行轮询获取数据');
        fetchFolderDocList(pollingFolderRef.current);
      } else {
        console.log('轮询条件不满足，跳过');
      }
    }, 5000);
  };

  // 停止轮询
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // 组件卸载时清理轮询定时器
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    folderDocs: folderDocListData?.items || [],
    folderDocListData,
    fetchFolderDocList,
    mutateFolderDocs: mutate,
    startPolling,
    stopPolling,
    pollingFolderRef,
    pollingSpaceIdRef,
    lastFolderDocDataRef,
  };
};

