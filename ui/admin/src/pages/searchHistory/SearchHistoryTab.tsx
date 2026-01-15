import { getAdminUserHistorySearch, ModelUserSearchHistory } from '@/api';
import { useListQueryParams } from '@/hooks/useListQueryParams';
import { Ellipsis, Table } from '@ctzhian/ui';
import { Stack, TextField, Typography } from '@mui/material';
import { useRequest } from 'ahooks';
import { ColumnsType } from '@ctzhian/ui/dist/Table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

const SearchHistoryTab = () => {
  const { query, page, size, setParams, setSearch } = useListQueryParams();
  const [keyword, setKeyword] = useState(query.keyword || '');
  const [username, setUsername] = useState(query.username || '');

  const {
    data,
    loading,
    run: fetchData,
  } = useRequest(params => getAdminUserHistorySearch({ page, size, ...params }), { manual: true });

  useEffect(() => {
    const _query: any = { ...query };
    delete _query.name;
    fetchData(_query);
  }, [query, fetchData]);

  // 搜索历史的列
  const columns: ColumnsType<ModelUserSearchHistory> = [
    {
      title: '搜索内容',
      dataIndex: 'keyword',
      render: (_, record) => {
        return <Ellipsis>{record?.keyword || '-'}</Ellipsis>;
      },
    },
    {
      title: '用户',
      dataIndex: 'username',
      render: (_, record) => {
        return record?.username ? record.username : '匿名游客';
      },
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      render: (_, record) => {
        if (!record?.created_at) return '-';
        const time = record.created_at * 1000;
        return (
          <Stack>
            <Typography variant="body2">{dayjs(time).fromNow()}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {dayjs(time).format('YYYY-MM-DD HH:mm:ss')}
            </Typography>
          </Stack>
        );
      },
    },
  ];

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="caption">共 {data?.total || 0} 条记录</Typography>
        <TextField
          label="搜索内容"
          value={keyword}
          size="small"
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              setSearch({
                keyword: keyword || undefined,
                username: username || undefined,
              });
            }
          }}
        />
        <TextField
          label="用户"
          value={username}
          size="small"
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              setSearch({
                keyword: keyword || undefined,
                username: username || undefined,
              });
            }
          }}
        />
      </Stack>
      <Table
        sx={{ mx: -2, flex: 1, height: '0' }}
        PaginationProps={{
          sx: {
            pt: 2,
            mx: 2,
          },
        }}
        loading={loading}
        columns={columns}
        dataSource={data?.items || []}
        rowKey="id"
        pagination={{
          page,
          pageSize: size,
          total: data?.total || 0,
          onChange: (page: number, size: number) => {
            setParams({
              page,
              size,
            });
          },
        }}
      />
    </>
  );
};

export default SearchHistoryTab;
