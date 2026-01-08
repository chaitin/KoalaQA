import { useRequest } from 'ahooks';
import { useState, useEffect } from 'react';
import {
  getAdminKbKbIdSpaceSpaceIdRemote,
  PlatformPlatformType,
  SvcListAnydocNode,
} from '@/api';
import { flattenTree } from '../utils';

export const useRemoteSpaces = (kbId: number) => {
  const [treeData, setTreeData] = useState<SvcListAnydocNode | null>(null);

  const { data: remoteData, run: fetchRemoteSpaces } = useRequest(
    (id: number, platform?: number) => {
      const promise = getAdminKbKbIdSpaceSpaceIdRemote({ kbId, spaceId: id });

      // 如果是飞书平台，在返回数据中添加云盘数据
      if (platform !== undefined && platform === PlatformPlatformType.PlatformFeishu) {
        return promise.then(response => {
          // 处理树形结构数据
          const treeNode = response;
          if (treeNode) {
            // 如果返回的是树形结构，转换为平铺数组用于兼容
            const flatItems = flattenTree(treeNode);
            // 检查是否已经存在云盘数据，避免重复添加
            const hasCloudDisk = flatItems.some(item => item.doc_id === 'cloud_disk');
            if (!hasCloudDisk) {
              // 在树形结构的根节点添加云盘
              treeNode.children ??= [];
              // 检查 children 中是否已经有云盘（避免重复添加）
              const hasCloudDiskInChildren = treeNode.children.some(
                child => child.value?.id === 'cloud_disk'
              );
              if (!hasCloudDiskInChildren) {
                treeNode.children.unshift({
                  value: {
                    id: 'cloud_disk',
                    title: '云盘',
                    file: false,
                    file_type: '',
                    summary: '',
                    updated_at: 0,
                    error: '',
                  },
                });
              }
            }
          }
          return response;
        });
      }

      return promise;
    },
    {
      manual: true,
    }
  );

  // 当远程数据变化时，重置本地树形结构
  useEffect(() => {
    if (remoteData) {
      setTreeData(remoteData);
    } else {
      setTreeData(null);
    }
  }, [remoteData]);

  return {
    treeData,
    setTreeData,
    fetchRemoteSpaces,
  };
};

