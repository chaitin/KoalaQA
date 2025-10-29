'use client';

import { getGroup, ModelGroupItemInfo, ModelGroupWithItem } from '@/api';
import { SxProps, Theme } from '@mui/material';
import {
  createContext,
  Dispatch,
  SetStateAction,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useParams } from 'next/navigation';
import { useForumId } from '@/hooks/useForumId';

export const CommonContext = createContext<{
  headerStyle: SxProps<Theme>;
  setHeaderStyle: Dispatch<SetStateAction<SxProps<Theme>>>;
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

const CommonProvider = ({ children }: { children: React.ReactNode }) => {
  const params = useParams();
  const forumId = useForumId();
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const [headerStyle, setHeaderStyle] = useState<SxProps<Theme>>({});
  const [keywords, setKeywords] = useState('');
  const [groupsLoading, setGroupsLoading] = useState(false); // 固定初始值为false，避免hydration不匹配
  const [groups, setGroupsState] = useState<{
    origin: (ModelGroupWithItem & {
      items?: ModelGroupItemInfo[];
    })[];
    flat: ModelGroupItemInfo[];
  }>({
    origin: [],
    flat: [],
  });

  // 使用 ref 替代模块级变量，避免 SSR 数据泄露
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  // 设置groups数据的函数（供SSR页面调用）
  const setGroups = useCallback(
    (newGroups: {
      origin: (ModelGroupWithItem & {
        items?: ModelGroupItemInfo[];
      })[];
      flat: ModelGroupItemInfo[];
    }) => {
      setGroupsState(newGroups);
      setGroupsLoading(false);
      hasFetchedRef.current = true;
    },
    []
  );

  // 获取groups数据的函数（供客户端页面调用）
  const fetchGroup = useCallback(() => {
    // 如果没有 forumId，不发起请求
    if (!forumId) {
      setGroupsLoading(false);
      return;
    }

    // 避免重复请求
    if (isFetchingRef.current || hasFetchedRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setGroupsLoading(true);
    
    getGroup({ forum_id: forumId })
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

        setGroupsState(newGroups);
        hasFetchedRef.current = true;
      })
      .catch((error) => {
        console.error('Failed to fetch groups:', error);
      })
      .finally(() => {
        setGroupsLoading(false);
        isFetchingRef.current = false;
      });
  }, [forumId]);

  // forumId 变化时重置已获取标记与数据，确保切换板块后重新拉取
  useEffect(() => {
    hasFetchedRef.current = false;
    setGroupsState({ origin: [], flat: [] });
  }, [forumId]);

  useEffect(() => {
    // 只在客户端且未获取过数据时发起请求
    if (!hasFetchedRef.current) {
      fetchGroup();
    }
  }, [fetchGroup]);

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
