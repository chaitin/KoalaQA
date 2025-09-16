'use client';

// 移除getGroup导入，因为现在通过SSR获取groups数据
import { SxProps, Theme } from '@mui/material';
import {
  createContext,
  Dispatch,
  SetStateAction,
  Suspense,
  useState,
} from 'react';

export const CommonContext = createContext<{
  headerStyle: SxProps<Theme>;
  setHeaderStyle: Dispatch<SetStateAction<{}>>;
  showHeaderSearch: boolean;
  setShowHeaderSearch: Dispatch<SetStateAction<boolean>>;
  keywords: string;
  setKeywords: Dispatch<SetStateAction<string>>;
}>({
  headerStyle: {},
  setHeaderStyle: () => {},
  showHeaderSearch: false,
  setShowHeaderSearch: () => {},
  keywords: '',
  setKeywords: () => {},
});

const CommonProvider = ({ children }: { children: React.ReactNode }) => {
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const [headerStyle, setHeaderStyle] = useState({});
  const [keywords, setKeywords] = useState('');
  return (
    <CommonContext.Provider
      value={{
        headerStyle,
        setHeaderStyle,
        showHeaderSearch,
        setShowHeaderSearch,
        keywords,
        setKeywords,
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
