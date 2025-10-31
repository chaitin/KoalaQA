import { getAdminOrg } from '@/api';
import Card from '@/components/card';
import CusTabs from '@/components/CusTabs';
import { useRequest } from 'ahooks';
import { Stack } from '@mui/material';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import OrgList from './OrgList';
import UserList from './UserList';

const AdminDocument = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab');
    return tab === 'org' ? 2 : 1; // 1: 用户, 2: 组织
  }, [searchParams]);

  // 获取组织列表（父组件获取，传递给子组件）
  const { data: orgListData, run: fetchOrgList } = useRequest(
    () =>
      getAdminOrg({}).then(r => {
        return {
          items: r.items?.sort((a, b) => {
            return (a.created_at || 0) - (b.created_at || 0);
          }),
          total: r.total,
        };
      }),
    { manual: true }
  );

  useEffect(() => {
    fetchOrgList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (value: number | string) => {
    const newParams = new URLSearchParams();
    if (value === 2) {
      newParams.set('tab', 'org');
    }
    setSearchParams(newParams, { replace: true });
  };

  const orgList = orgListData?.items || [];

  return (
    <Stack component={Card} sx={{ height: '100%' }}>
      <CusTabs
        sx={{ alignSelf: 'baseline', mb: 2 }}
        list={[
          { label: '用户', value: 1 },
          { label: '组织', value: 2 },
        ]}
        value={activeTab}
        onChange={handleTabChange}
      />
      {activeTab === 1 ? (
        <UserList orgList={orgList} fetchOrgList={fetchOrgList} />
      ) : (
        <OrgList orgList={orgList} onRefresh={fetchOrgList} />
      )}
    </Stack>
  );
};

export default AdminDocument;
