import {
  deleteAdminUserUserId,
  getAdminKbKbIdQuestion,
  getAdminUser,
  ModelUserRole,
  putAdminUserUserId,
  SvcUserListItem,
} from '@/api';
import Card from '@/components/card';
import { useListQueryParams } from '@/hooks/useListQueryParams';
import { message, Modal, Table } from '@c-x/ui';
import {
  Box,
  Button,
  Stack,
  TextField,
  Select,
  Typography,
  MenuItem,
  InputLabel,
  FormControl,
} from '@mui/material';
import { useBoolean, useRequest } from 'ahooks';
import { ColumnsType } from 'ct-mui/dist/Table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';

const transRole: Record<ModelUserRole, string> = {
  [ModelUserRole.UserRoleUnknown]: '未知',
  [ModelUserRole.UserRoleAdmin]: '超级管理员',
  [ModelUserRole.UserRoleOperator]: '前台管理员',
  [ModelUserRole.UserRoleUser]: '用户',
  [ModelUserRole.UserRoleMax]: '未知',
};

const AdminDocument = () => {
  const { query, setPage, setPageSize, page, pageSize, setParams } =
    useListQueryParams();
  const { id } = useParams();
  const { reset, register, handleSubmit, watch, control } = useForm({
    defaultValues: {
      name: '',
      role: 1,
    },
  });
  const [title, setTitle] = useState(query.title);
  const [editItem, setEditItem] = useState<SvcUserListItem | null>(null);
  const cancelEdit = () => {
    setEditItem(null);
    reset();
  };
  const {
    data,
    loading,
    run: fetchData,
  } = useRequest((params) => getAdminUser({ ...params }), { manual: true });
  const deleteUser = (item: SvcUserListItem) => {
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
            {item!.name}
          </Box>{' '}
          吗？
        </>
      ),
      onOk: () => {
        deleteAdminUserUserId(item.id!).then(() => {
          message.success('删除成功');
          fetchData({
            page: 1,
          });
        });
      },
    });
  };
  const putUser = handleSubmit((data) => {
    if (editItem) {
      putAdminUserUserId(editItem.id!, data).then(() => {
        message.success('修改成功');
        fetchData({});
        cancelEdit();
      });
    }
  });
  const columns: ColumnsType<SvcUserListItem> = [
    {
      title: '用户名',
      dataIndex: 'name',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      render: (_, record) => {
        return record.email || '-';
      },
    },
    {
      title: '角色',
      dataIndex: 'role',
      render: (_, record) => {
        return transRole[record.role || ModelUserRole.UserRoleUnknown];
      },
    },
    {
      title: '最近一次登录',
      dataIndex: 'last_login',
      render: (_, record) => {
        const time = (record?.last_login || 0) * 1000;
        return record.last_login === 0 ? (
          '-'
        ) : (
          <Stack>
            <Typography variant='body2'>{dayjs(time).fromNow()}</Typography>
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {dayjs(time).format('YYYY-MM-DD HH:mm:ss')}
            </Typography>
          </Stack>
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
              onClick={() => {
                setEditItem(record);
                reset(record);
              }}
            >
              编辑
            </Button>
            <Button
              variant='text'
              size='small'
              color='error'
              onClick={() => deleteUser(record)}
            >
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
      <Stack direction='row' alignItems='center' spacing={2} sx={{ mb: 2 }}>
        <Typography variant='caption'>共 {data?.total || 0} 个用户</Typography>
        <TextField
          label='用户名'
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
      <Modal
        open={!!editItem}
        onCancel={cancelEdit}
        sx={{
          py: 2,
        }}
        title='编辑用户'
        onOk={putUser}
      >
        <FormControl fullWidth sx={{ my: 2 }}>
          <TextField
            {...register('name')}
            label='用户名'
            required
            slotProps={{
              inputLabel: {
                shrink: !watch('name') || undefined,
              },
            }}
          />
        </FormControl>

        <FormControl fullWidth sx={{ my: 2 }}>
          <InputLabel id='select-label'>角色</InputLabel>
          <Controller
            name='role'
            control={control}
            render={({ field }) => (
              <Select
                labelId='select-label'
                fullWidth
                label='角色'
                {...field}
                onChange={(e) => field.onChange(Number(e.target.value))}
              >
                {Object.entries(transRole)
                  .slice(1, -1)
                  .map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value}
                    </MenuItem>
                  ))}
              </Select>
            )}
          />
        </FormControl>
      </Modal>
    </Stack>
  );
};

export default AdminDocument;
