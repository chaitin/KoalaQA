import { getAdminUserReview, ModelUserReviewWithUser } from '@/api';
import Card from '@/components/card';
import { Ellipsis, Table } from '@ctzhian/ui';
import { Box, Chip, Stack, Typography, Tooltip } from '@mui/material';
import { useRequest } from 'ahooks';
import { ColumnsType } from '@ctzhian/ui/dist/Table';
import dayjs from 'dayjs';
import { useEffect, useMemo } from 'react';
import { useListQueryParams } from '@/hooks/useListQueryParams';
import { useBreadcrumbStore } from '@/store';

// 审批状态枚举
enum ReviewState {
  Review = 0, // 待审核
  Pass = 1, // 通过
  Deny = 2, // 拒绝
}

// 登录方式映射
const AUTH_TYPE_MAP: Record<number, string> = {
  1: '密码认证',
  2: 'OIDC 认证',
  3: '企业微信认证',
  4: '微信扫码认证',
};

// 审批状态映射
const REVIEW_STATE_MAP: Record<number, { text: string; color: 'success' | 'error' | 'default' }> = {
  [ReviewState.Review]: { text: '待审核', color: 'default' },
  [ReviewState.Pass]: { text: '已通过', color: 'success' },
  [ReviewState.Deny]: { text: '已拒绝', color: 'error' },
};

const UserReviewList = () => {
  const { setPageName } = useBreadcrumbStore();
  const { page, size, setParams } = useListQueryParams();

  // 获取已通过和已拒绝的记录
  const {
    data: reviewData,
    loading: reviewLoading,
    run: fetchReviewData,
  } = useRequest(
    params =>
      getAdminUserReview({
        page: params.page,
        size: params.size,
        state: [ReviewState.Pass, ReviewState.Deny],
      }),
    { manual: true }
  );

  // 合并已通过和已拒绝的记录，使用useMemo确保正确计算
  const recordData = useMemo(() => {
    const allItems = (reviewData?.items || []).sort(
      (a, b) => (b.created_at || 0) - (a.created_at || 0)
    ); // 按创建时间倒序

    // 前端分页
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedItems = allItems.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      total: allItems.length,
    };
  }, [reviewData, page, size]);

  const recordLoading = reviewLoading;

  useEffect(() => {
    // 设置面包屑导航
    setPageName('审批记录');
    return () => {
      setPageName('');
    };
  }, [setPageName]);

  useEffect(() => {
    // 查询所有已通过和已拒绝的记录（不分页，前端分页）
    fetchReviewData({
      page: 1,
      size: 1000, // 查询足够多的记录
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 审批记录列表列定义
  const recordColumns: ColumnsType<ModelUserReviewWithUser> = [
    {
      title: '用户名',
      dataIndex: 'user_name',
      render: (_, record) => {
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            {record.user_avatar && (
              <Box
                component="img"
                src={record.user_avatar}
                alt={record.user_name}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                }}
              />
            )}
            <Typography variant="body2">{record.user_name || '-'}</Typography>
          </Stack>
        );
      },
    },
    {
      title: '登录方式',
      dataIndex: 'auth_type',
      render: (_, record) => {
        const authType = record.auth_type || 1;
        return (
          <Typography variant="body2">{AUTH_TYPE_MAP[authType] || `未知(${authType})`}</Typography>
        );
      },
    },
    {
      title: '申请原因',
      dataIndex: 'reason',
      render: (_, record) => {
        return <Ellipsis>{record.reason || '-'}</Ellipsis>;
      },
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      render: (_, record) => {
        const time = (record.created_at || 0) * 1000;
        return (
          <Stack>
            <Typography variant="body2">{dayjs(time).format('YYYY-MM-DD')}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {dayjs(time).format('HH:mm:ss')}
            </Typography>
          </Stack>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'state',
      render: (_, record) => {
        const state = record.state ?? ReviewState.Review;
        const stateInfo = REVIEW_STATE_MAP[state] || REVIEW_STATE_MAP[ReviewState.Review];
        return (
          <Chip
            label={stateInfo.text}
            color={stateInfo.color}
            size="small"
            sx={{ height: 24, fontSize: '12px' }}
          />
        );
      },
    },
  ];

  return (
    <Stack component={Card} sx={{ height: '100%' }}>
      <Table
        sx={{ mx: -2, flex: 1, overflow: 'auto' }}
        PaginationProps={{
          sx: {
            pt: 2,
            mx: 2,
          },
        }}
        loading={recordLoading}
        columns={recordColumns}
        dataSource={recordData.items || []}
        rowKey="id"
        pagination={{
          page,
          pageSize: size,
          total: recordData.total || 0,
          onChange: (page: number, size: number) => {
            setParams({
              page,
              size,
            });
          },
        }}
      />
    </Stack>
  );
};

export default UserReviewList;
