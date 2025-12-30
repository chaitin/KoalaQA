import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
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
  const [groups, setGroups] = useState<(ModelGroupWithItem & { items?: ModelGroupItemInfo[] })[]>(
    []
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAdminGroup();
      setGroups(response.items || []);
    } catch (error) {
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
