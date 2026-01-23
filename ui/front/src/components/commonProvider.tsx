'use client';

import { getForumForumIdTags, getGroup, ModelDiscussionTag, ModelGroupItemInfo, ModelGroupWithItem } from '@/api';
import { SxProps, Theme } from '@mui/material';
import {
  createContext,
  Dispatch,
  SetStateAction,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams, useSelectedLayoutSegments } from 'next/navigation';
import { useForumId } from '@/hooks/useForumId';
import { useForumStore } from '@/store';

export const CommonContext = createContext<{
  headerStyle: SxProps<Theme>;
  setHeaderStyle: Dispatch<SetStateAction<SxProps<Theme>>>;
  showHeaderSearch: boolean;
  setShowHeaderSearch: Dispatch<SetStateAction<boolean>>;
  keywords: string;
  setKeywords: Dispatch<SetStateAction<string>>;
  tags: ModelDiscussionTag[];
  tagsLoading: boolean;
  fetchTags: () => void;
  setTags: (tags: ModelDiscussionTag[]) => void;
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
  setHeaderStyle: () => { },
  showHeaderSearch: false,
  setShowHeaderSearch: () => { },
  keywords: '',
  setKeywords: () => { },
  tags: [],
  tagsLoading: true,
  fetchTags: () => { },
  setTags: () => { },
  groups: {
    origin: [],
    flat: [],
  },
  groupsLoading: true,
  fetchGroup: () => { },
  setGroups: () => { },
});

const CommonProvider = ({ children }: { children: React.ReactNode }) => {
  const params = useParams();
  const segments = useSelectedLayoutSegments();
  const forumId = useForumId();
  const forums = useForumStore((s) => s.forums);

  // 综合判断当前是否处于某个板块路由下
  const currentRouteName = useMemo(() => {
    return (params?.route_name as string | undefined) || (segments && segments.length > 0 ? segments[0] : undefined);
  }, [params?.route_name, segments]);

  // 获取有效的 forumId：优先使用路由中的 forumId，否则使用第一个 forum 的 id
  const effectiveForumId = useMemo(() => {
    if (forumId) {
      return forumId;
    }
    // 如果没有 forumId，使用第一个 forum 的 id 作为默认值
    if (forums.length > 0) {
      return forums[0].id;
    }
    return null;
  }, [forumId, forums]);

  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const [headerStyle, setHeaderStyle] = useState<SxProps<Theme>>({});
  const [keywords, setKeywords] = useState('');
  const [tags, setTagsState] = useState<ModelDiscussionTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
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
  const isFetchingTagsRef = useRef(false);
  const hasFetchedTagsRef = useRef(false);

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

  // 设置tags数据的函数（供SSR页面调用）
  const setTags = useCallback((newTags: ModelDiscussionTag[]) => {
    setTagsState(newTags);
    setTagsLoading(false);
    hasFetchedTagsRef.current = true;
  }, []);

  // 获取groups数据的函数（供客户端页面调用）
  const fetchGroup = useCallback(() => {
    // 如果没有有效的 forumId（包括默认的第一个 forum），说明 forums 还没加载完，先不请求
    if (!effectiveForumId) {
      return;
    }

    // 避免重复请求
    if (isFetchingRef.current || hasFetchedRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setGroupsLoading(true);

    getGroup({ forum_id: effectiveForumId })
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
  }, [effectiveForumId]);

  // 获取tags数据的函数（供客户端页面调用）
  const fetchTags = useCallback(() => {
    if (!forumId) {
      setTagsLoading(false);
      return;
    }

    if (isFetchingTagsRef.current || hasFetchedTagsRef.current) {
      return;
    }

    isFetchingTagsRef.current = true;
    setTagsLoading(true);

    getForumForumIdTags({ forumId })
      .then((res) => {
        const items = (Array.isArray(res) ? res?.[0]?.items : (res as any)?.items) as
          | ModelDiscussionTag[]
          | undefined;
        const validTags = (items ?? []).filter((tag) => typeof tag?.id === 'number');
        setTagsState(validTags);
        hasFetchedTagsRef.current = true;
      })
      .catch((error) => {
        console.error('Failed to fetch tags:', error);
      })
      .finally(() => {
        setTagsLoading(false);
        isFetchingTagsRef.current = false;
      });
  }, [forumId]);

  // effectiveForumId 变化时重置已获取标记与数据，确保切换板块后重新拉取
  useEffect(() => {
    hasFetchedRef.current = false;
    setGroupsState({ origin: [], flat: [] });
    hasFetchedTagsRef.current = false;
    setTagsState([]);
  }, [effectiveForumId]);

  useEffect(() => {
    // 只在客户端且未获取过数据时发起请求
    if (!hasFetchedRef.current) {
      fetchGroup();
    }
    if (!hasFetchedTagsRef.current) {
      fetchTags();
    }
  }, [fetchGroup, fetchTags]);

  return (
    <CommonContext.Provider
      value={{
        headerStyle,
        setHeaderStyle,
        showHeaderSearch,
        setShowHeaderSearch,
        keywords,
        setKeywords,
        tags,
        tagsLoading,
        fetchTags,
        setTags,
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
