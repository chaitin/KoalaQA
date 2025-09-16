'use client';

import { getGroup, ModelGroupItemInfo, ModelGroupWithItem } from '@/api';
import { SxProps, Theme } from '@mui/material';
import {
  createContext,
  Dispatch,
  SetStateAction,
  Suspense,
  useEffect,
  useState,
} from 'react';

export const CommonContext = createContext<{
  headerStyle: SxProps<Theme>;
  setHeaderStyle: Dispatch<SetStateAction<{}>>;
  showHeaderSearch: boolean;
  setShowHeaderSearch: Dispatch<SetStateAction<boolean>>;
  keywords: string;
  setKeywords: Dispatch<SetStateAction<string>>;
  groups: {
    origin: (ModelGroupWithItem & {
      items?: ModelGroupItemInfo[];
    })[];
    flat: ModelGroupItemInfo[];
  };
  groupsLoading: boolean;
  fetchGroup: () => void;
  setGroups: (groups: {
    origin: (ModelGroupWithItem & {
      items?: ModelGroupItemInfo[];
    })[];
    flat: ModelGroupItemInfo[];
  }) => void;
}>({
  headerStyle: {},
  setHeaderStyle: () => {},
  showHeaderSearch: false,
  setShowHeaderSearch: () => {},
  keywords: '',
  setKeywords: () => {},
  groups: {
    origin: [],
    flat: [],
  },
  groupsLoading: true,
  fetchGroup: () => {},
  setGroups: () => {},
});

// 全局缓存groups数据
let globalGroupsCache: {
  origin: (ModelGroupWithItem & {
    items?: ModelGroupItemInfo[];
  })[];
  flat: ModelGroupItemInfo[];
} | null = null;

const CommonProvider = ({ children }: { children: React.ReactNode }) => {
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const [headerStyle, setHeaderStyle] = useState({});
  const [keywords, setKeywords] = useState('');
  const [groupsLoading, setGroupsLoading] = useState(!globalGroupsCache);
  const [groups, setGroupsState] = useState<{
    origin: (ModelGroupWithItem & {
      items?: ModelGroupItemInfo[];
    })[];
    flat: ModelGroupItemInfo[];
  }>(
    globalGroupsCache || {
      origin: [],
      flat: [],
    }
  );

  // 设置groups数据的函数（供SSR页面调用）
  const setGroups = (newGroups: {
    origin: (ModelGroupWithItem & {
      items?: ModelGroupItemInfo[];
    })[];
    flat: ModelGroupItemInfo[];
  }) => {
    globalGroupsCache = newGroups;
    setGroupsState(newGroups);
    setGroupsLoading(false);
  };

  // 获取groups数据的函数（供客户端页面调用）
  const fetchGroup = () => {
    // 如果已有缓存，直接使用
    if (globalGroupsCache) {
      setGroupsState(globalGroupsCache);
      setGroupsLoading(false);
      return;
    }

    setGroupsLoading(true);
    getGroup()
      .then((r) => {
        const newGroups = {
          origin: r.items ?? [],
          flat: (r.items?.filter((i) => !!i.items) || []).reduce(
            (acc, item) => {
              acc.push(...(item.items || []));
              return acc;
            },
            [] as ModelGroupItemInfo[]
          ),
        };

        // 更新全局缓存
        globalGroupsCache = newGroups;
        setGroupsState(newGroups);
      })
      .catch((error) => {
        console.error('Failed to fetch groups:', error);
      })
      .finally(() => {
        setGroupsLoading(false);
      });
  };

  useEffect(() => {
    // 只有在没有缓存数据时才发起请求
    if (!globalGroupsCache) {
      fetchGroup();
    }
  }, []);

  return (
    <CommonContext.Provider
      value={{
        headerStyle,
        setHeaderStyle,
        showHeaderSearch,
        setShowHeaderSearch,
        keywords,
        setKeywords,
        groups,
        groupsLoading,
        fetchGroup,
        setGroups,
      }}
    >
      {children}
    </CommonContext.Provider>
  );
};

export default function CommonProviderWrap({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <CommonProvider>{children}</CommonProvider>
    </Suspense>
  );
}
