'use client';

import { useContext, useEffect } from 'react';
import { CommonContext } from './commonProvider';
import { ModelGroupWithItem, ModelGroupItemInfo, ModelListRes } from '@/api/types';

interface GroupsInitializerProps {
  groupsData: ModelListRes & {
    items?: (ModelGroupWithItem & {
      items?: ModelGroupItemInfo[];
    })[];
  };
  children: React.ReactNode;
}

const GroupsInitializer: React.FC<GroupsInitializerProps> = ({ groupsData, children }) => {
  const { setGroups } = useContext(CommonContext);

  useEffect(() => {
    // 将SSR获取的groups数据设置到CommonContext中
    const processedGroups = {
      origin: groupsData.items ?? [],
      flat: (groupsData.items?.filter((i) => !!i.items) || []).reduce((acc, item) => {
        acc.push(...(item.items || []));
        return acc;
      }, [] as ModelGroupItemInfo[]),
    };
    
    setGroups(processedGroups);
  }, [groupsData]); // 移除setGroups依赖，因为现在它是稳定的

  return <>{children}</>;
};

export default GroupsInitializer;