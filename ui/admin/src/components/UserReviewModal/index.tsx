import { getAdminUserReview, ModelUserReviewWithUser, putAdminUserReviewReviewId } from '@/api';
import { message, Modal, Table } from '@ctzhian/ui';
import { Badge, Box, Button, Stack, Typography, Tooltip } from '@mui/material';
import { useRequest } from 'ahooks';
import { ColumnsType } from '@ctzhian/ui/dist/Table';
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

interface UserReviewModalProps {
  open: boolean;
  onClose: () => void;
}

const UserReviewModal = ({ open, onClose }: UserReviewModalProps) => {
  const navigate = useNavigate();
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingSize] = useState(20);

  // 获取待审批列表
  const {
    data: pendingData,
    loading: pendingLoading,
    run: fetchPendingData,
  } = useRequest(
    params =>
      getAdminUserReview({
        ...params,
        state: [ReviewState.Review], // 只查询待审核的
      }),
    { manual: true }
  );


  useEffect(() => {
    if (open) {
      fetchPendingData({
        page: pendingPage,
        size: pendingSize,
      });
    }
  }, [open, pendingPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // 处理审批操作
  const handleReview = async (reviewId: number, state: ReviewState.Pass | ReviewState.Deny) => {
    try {
      await putAdminUserReviewReviewId({ reviewId: String(reviewId) }, { state });
      message.success(state === ReviewState.Pass ? '审批通过' : '审批拒绝');
      // 刷新列表
      fetchPendingData({
        page: pendingPage,
        size: pendingSize,
      });
    } catch (error) {
      console.error('审批失败:', error);
      message.error('审批失败');
    }
  };

  // 待审批列表列定义
  const pendingColumns: ColumnsType<ModelUserReviewWithUser> = [
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
        const reason = record.reason || '';
        const maxLength = 50;
        const shouldTruncate = reason.length > maxLength;
        const displayText = shouldTruncate ? reason.substring(0, maxLength) + '...' : reason;

        return (
          <Tooltip title={shouldTruncate ? reason : ''} arrow>
            <Typography
              variant="body2"
              sx={{
                maxWidth: 300,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayText || '-'}
            </Typography>
          </Tooltip>
        );
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
      title: '操作',
      dataIndex: 'opt',
      render: (_, record) => {
        return (
          <Stack direction="row" spacing={1}>
            <Button
              variant="text"
              size="small"
              color="info"
              onClick={() => handleReview(record.id!, ReviewState.Pass)}
            >
              通过
            </Button>
            <Button
              variant="text"
              size="small"
              color="error"
              onClick={() => handleReview(record.id!, ReviewState.Deny)}
            >
              拒绝
            </Button>
          </Stack>
        );
      },
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="用户审批"
      width='780px'
      sx={{
        py: 2,
        '& .MuiModal-root': {
          maxWidth: '90vw',
        },
      }}
      footer={
        <Stack direction="row" justifyContent="space-between" sx={{ width: '100%', px: 3, pb: 3 }}>
          <Button
            variant="outlined"
            onClick={() => {
              onClose();
              navigate('/admin/users/review');
            }}
          >
            查看审批记录
          </Button>
          <Button variant="contained" onClick={onClose}>
            关闭
          </Button>
        </Stack>
      }
    >
      <Box sx={{ width: '100%' }}>
        <Table
          loading={pendingLoading}
          columns={pendingColumns}
          dataSource={pendingData?.items || []}
          rowKey="id"
          pagination={{
            page: pendingPage,
            pageSize: pendingSize,
            total: pendingData?.total || 0,
            onChange: (page: number, size: number) => {
              setPendingPage(page);
            },
          }}
        />
      </Box>
    </Modal>
  );
};

export default UserReviewModal;
