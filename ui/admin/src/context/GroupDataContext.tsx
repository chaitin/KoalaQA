import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { getAdminGroup } from '@/api';
import { ModelGroupWithItem, ModelGroupItemInfo } from '@/api/types';

interface GroupDataContextType {
  groups: (ModelGroupWithItem & {
    items?: ModelGroupItemInfo[];
  })[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const GroupDataContext = createContext<GroupDataContextType>({
  groups: [],
  loading: false,
  refresh: async () => {},
});

export const useGroupData = () => {
  const context = useContext(GroupDataContext);
  if (!context) {
    throw new Error('useGroupData must be used within GroupDataProvider');
  }
  return context;
};

interface GroupDataProviderProps {
  children: ReactNode;
}

export const GroupDataProvider: React.FC<GroupDataProviderProps> = ({ children }) => {
  const [groups, setGroups] = useState<(ModelGroupWithItem & { items?: ModelGroupItemInfo[] })[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAdminGroup();
      // 根据 API 类型定义：ContextResponse & { data?: ModelListRes & { items?: ... } }
      // 根据实际使用（DragBrand中使用 res.items），httpClient 可能已经解包了 data
      // 为了兼容，同时检查两种情况
      const items = 
        (response as any).items || 
        (response as any).data?.items || 
        [];
      setGroups(items);
    } catch (error) {
      console.error('获取分组数据失败:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <GroupDataContext.Provider value={{ groups, loading, refresh }}>
      {children}
    </GroupDataContext.Provider>
  );
};

