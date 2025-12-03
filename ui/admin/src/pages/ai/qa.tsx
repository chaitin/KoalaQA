import {
  deleteAdminKbKbIdQuestionQaId,
  getAdminKbKbIdQuestion,
  getAdminKbKbIdQuestionQaId,
  ModelDocStatus,
  ModelKBDocumentDetail,
  SvcDocListItem,
} from '@/api';
import Card from '@/components/card';
import StatusBadge from '@/components/StatusBadge';
import { useListQueryParams } from '@/hooks/useListQueryParams';
import { Ellipsis, message, Modal, Table } from '@ctzhian/ui';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QaImport from './qaImport';
import LoadingBtn from '@/components/LoadingButton';
import { ColumnsType } from '@ctzhian/ui/dist/Table';

const AdminDocument = () => {
  const { query, page, size, setParams, setSearch } = useListQueryParams();
  const [searchParams] = useSearchParams();
  const kb_id = +searchParams.get('id')!;
  const [title, setTitle] = useState(query.title);
  const [editItem, setEditItem] = useState<ModelKBDocumentDetail | null>(null);

  const {
    data,
    loading,
    run: fetchData,
  } = useRequest(params => getAdminKbKbIdQuestion({ page, size, ...params, kbId: kb_id }), {
    manual: true,
  });
  const deleteDoc = (item: SvcDocListItem) => {
    Modal.confirm({
      title: '提示',
      okText: '删除',
      okButtonProps: {
        color: 'error',
      },
      content: (
        <>
          确定要删除
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {item!.title}
          </Box>{' '}
          吗？
        </>
      ),
      onOk: () => {
        deleteAdminKbKbIdQuestionQaId({ kbId: kb_id, qaId: item.id! }).then(() => {
          message.success('删除成功');
          fetchData({
            page: 1,
          });
        });
      },
    });
  };

  const { runAsync: fetchDetail } = useRequest(
    (qaId: number) => getAdminKbKbIdQuestionQaId({ kbId: kb_id, qaId }),
    {
      manual: true,
      onSuccess: res => {
        // 兼容 API 可能返回 {data: {...}} 或直接返回详情
        const detail = (res as any)?.data ?? res;
        setEditItem(detail as ModelKBDocumentDetail);
      },
    }
  );

  const columns: ColumnsType<SvcDocListItem> = [
    {
      title: '问题',
      dataIndex: 'title',
      render: (_, record) => {
        return <Ellipsis sx={{ fontSize: 14 }}>{record?.title || '-'}</Ellipsis>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (_, record) => {
        return (
          <StatusBadge
            status={record.status}
            onClick={() => {
              if (record.status === ModelDocStatus.DocStatusPendingReview) {
                fetchDetail(record.id!);
              }
            }}
          />
        );
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      // width: 120,
      render: (_, record) => {
        return dayjs((record?.updated_at || 0) * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      title: '',
      dataIndex: 'opt',
      // width: 120,
      render: (_, record) => {
        const isPendingReview = record?.status === ModelDocStatus.DocStatusPendingReview;
        const isApplying = record?.status === ModelDocStatus.DocStatusAppling;

        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            {isPendingReview ? (
              <>
                <LoadingBtn
                  variant="text"
                  size="small"
                  color="primary"
                  onClick={() => fetchDetail(record.id!)}
                >
                  查看
                </LoadingBtn>
                <Button variant="text" size="small" color="error" onClick={() => deleteDoc(record)}>
                  删除
                </Button>
              </>
            ) : isApplying ? (
              <>
                <LoadingBtn
                  variant="text"
                  size="small"
                  color="primary"
                  onClick={() => fetchDetail(record.id!)}
                >
                  编辑
                </LoadingBtn>
                <Button variant="text" size="small" color="error" onClick={() => deleteDoc(record)}>
                  删除
                </Button>
              </>
            ) : (
              <LoadingBtn
                variant="text"
                size="small"
                color="primary"
                onClick={() => fetchDetail(record.id!)}
              >
                编辑
              </LoadingBtn>
            )}
          </Stack>
        );
      },
    },
  ];

  useEffect(() => {
    const _query = { ...query };
    delete _query.name;
    fetchData(_query);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Stack component={Card} sx={{ height: '100%', pt: 0 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="caption">共 {data?.total || 0} 个问题</Typography>
          <TextField
            label="问题"
            value={title}
            size="small"
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setSearch({
                  title,
                });
              }
            }}
          />
        </Stack>
        <QaImport refresh={fetchData} setEditItem={setEditItem} editItem={editItem} />
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
    </Stack>
  );
};

export default AdminDocument;
