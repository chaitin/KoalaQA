import { Ellipsis, message, Modal, Table } from '@c-x/ui';
import Card from '@/components/card';
import {
  deleteAdminKbKbIdQuestionQaId,
  getAdminKbKbIdQuestion,
  ModelDocStatus,
  SvcDocListItem
} from '@/api';
import { useListQueryParams } from '@/hooks/useListQueryParams';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useRequest } from 'ahooks';
import { ColumnsType } from 'ct-mui/dist/Table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QaImport from './qaImport';

const AdminDocument = () => {
  const { query, setPage, setPageSize, page, pageSize, setParams } =
    useListQueryParams();
  const { id } = useParams();
  const kb_id = +(id || '0');
  const [title, setTitle] = useState(query.title);
  const [editItem, setEditItem] = useState<SvcDocListItem | null>(null);
  const {
    data,
    loading,
    run: fetchData,
  } = useRequest(
    (params) => getAdminKbKbIdQuestion({ ...params, kbId: kb_id }),
    { manual: true }
  );
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
          <Box component='span' sx={{ fontWeight: 700, color: 'text.primary' }}>
            {item!.title}
          </Box>{' '}
          吗？
        </>
      ),
      onOk: () => {
        deleteAdminKbKbIdQuestionQaId(kb_id, item.id!).then(() => {
          message.success('删除成功');
          fetchData({
            page: 1,
          });
        });
      },
    });
  };
  const columns: ColumnsType<SvcDocListItem> = [
    {
      title: '问题',
      dataIndex: 'title',
      render: (_, record) => {
        return (
          <Ellipsis sx={{ fontSize: 14 }}>{record?.title || '-'}</Ellipsis>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (_, record) => {
        if (!record?.status) return '-';
        return record.status === ModelDocStatus.DocStatusAppling
          ? '应用中'
          : '未应用';
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      // width: 120,
      render: (_, record) => {
        return dayjs((record?.updated_at || 0) * 1000).format(
          'YYYY-MM-DD HH:mm:ss'
        );
      },
    },
    {
      title: '',
      dataIndex: 'opt',
      // width: 120,
      render: (_, record) => {
        return (
          <Stack direction='row' alignItems='center' spacing={1}>
            <Button
              variant='text'
              size='small'
              color='primary'
              onClick={() => setEditItem(record)}
            >
              编辑
            </Button>
            <Button variant='text' size='small' color='error' onClick={() => deleteDoc(record)}>
              删除
            </Button>
          </Stack>
        );
      },
    },
  ];

  useEffect(() => {
    const _query = { ...query };
    delete _query.name;
    fetchData(_query);
  }, [query]);

  return (
    <Stack component={Card} sx={{ height: '100%' }}>
       <QaImport refresh={fetchData} setEditItem={setEditItem} editItem={editItem}  />
      <Stack direction='row' alignItems='center' spacing={2} sx={{ mb: 2 }}>
        <Typography variant='caption'>共 {data?.total || 0} 个问题</Typography>
        <TextField
          label='问题'
          value={title}
          size='small'
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setParams({
                title,
              });
            }
          }}
        />
      </Stack>
      <Table
        sx={{ mx: -2, flex: 1, overflow: 'auto' }}
        PaginationProps={{
          sx: {
            pt: 2,
            mx: 2,
          },
        }}
        loading={loading}
        columns={columns}
        dataSource={data?.items || []}
        rowKey='id'
        pagination={{
          page,
          pageSize,
          total: data?.total || 0,
          onChange: (page: number, size: number) => {
            setPage(page);
            setPageSize(size);
            fetchData({
              page: page,
              size: size,
            });
          },
        }}
      />
    </Stack>
  );
};

export default AdminDocument;
