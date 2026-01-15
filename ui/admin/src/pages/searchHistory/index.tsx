import Card from '@/components/card';
import CusTabs from '@/components/CusTabs';
import { Stack } from '@mui/material';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import AskHistory from './AskHistory';
import SearchHistoryTab from './SearchHistoryTab';

const SearchHistory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 从URL参数中获取tab，默认为'ask'
  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab');
    return tab === 'search' ? 'search' : 'ask';
  }, [searchParams]);

  const handleTabChange = (value: number | string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'search') {
      newParams.set('tab', 'search');
    } else {
      newParams.set('tab', 'ask');
    }
    setSearchParams(newParams, { replace: true });
  };

  return (
    <Stack component={Card} sx={{ height: '100%', p: 2 }}>
      <CusTabs
        sx={{ alignSelf: 'baseline', mb: 2 }}
        list={[
          { label: '智能问答', value: 'ask' },
          { label: '搜索查询', value: 'search' },
        ]}
        value={activeTab}
        onChange={handleTabChange}
      />
      {activeTab === 'ask' ? <AskHistory /> : <SearchHistoryTab />}
    </Stack>
  );
};

export default SearchHistory;
