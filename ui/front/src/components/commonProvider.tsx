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
  groups: (ModelGroupWithItem & {
    items?: ModelGroupItemInfo[];
  })[];
  fetchGroup: () => void;
}>({
  headerStyle: {},
  setHeaderStyle: () => {},
  showHeaderSearch: false,
  setShowHeaderSearch: () => {},
  keywords: '',
  setKeywords: () => {},
  groups: [],
  fetchGroup: () => {},
});

const CommonProvider = ({ children }: { children: React.ReactNode }) => {
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const [headerStyle, setHeaderStyle] = useState({});
  const [keywords, setKeywords] = useState('');
  const [groups, setGroups] = useState<
    (ModelGroupWithItem & {
      items?: ModelGroupItemInfo[];
    })[]
  >([]);

  const fetchGroup = () => {
    getGroup().then((r) => setGroups(r.items?.filter((i) => !!i.items) || []));
  };
  useEffect(() => {
    fetchGroup();
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
        fetchGroup,
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
