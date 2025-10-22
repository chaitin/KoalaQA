import {
  deleteAdminUserUserId,
  getAdminUser,
  ModelUserRole,
  putAdminUserUserId,
  SvcUserListItem,
} from '@/api';
import Card from '@/components/card';
import RoleInfo from '@/components/RoleInfo';
import { useListQueryParams } from '@/hooks/useListQueryParams';
import { message, Modal, Table } from '@ctzhian/ui';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { ColumnsType } from '@ctzhian/ui/dist/Table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

const transRole: Record<ModelUserRole, string> = {
  [ModelUserRole.UserRoleUnknown]: '未知',
  [ModelUserRole.UserRoleAdmin]: '管理员',
  [ModelUserRole.UserRoleOperator]: '客服运营',
  [ModelUserRole.UserRoleUser]: '用户',
  [ModelUserRole.UserRoleMax]: '未知',
};


const AdminDocument = () => {
  const { query, page, size, setParams } = useListQueryParams();
  const { reset, register, handleSubmit, watch, control } = useForm({
    defaultValues: {
      name: '',
      role: 1,
    },
  });
  const [name, setName] = useState(query.name);
  const [editItem, setEditItem] = useState<SvcUserListItem | null>(null);
  const cancelEdit = () => {
    setEditItem(null);
    reset();
  };
  const {
    data,
    loading,
    run: fetchData,
  } = useRequest(params => getAdminUser({ ...params }), { manual: true });
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
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {item!.name}
          </Box>{' '}
          吗？
        </>
      ),
      onOk: () => {
        deleteAdminUserUserId({userId: item.id!}).then(() => {
          message.success('删除成功');
          fetchData({
            page: 1,
          });
        });
      },
    });
  };
  const putUser = handleSubmit(data => {
    if (editItem) {
      putAdminUserUserId({userId: editItem.id!}, data).then(() => {
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
        return (
          <RoleInfo role={record.role || ModelUserRole.UserRoleUnknown} showDescription={false} />
        );
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
            <Typography variant="body2">{dayjs(time).fromNow()}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button
              variant="text"
              size="small"
              color="info"
              onClick={() => {
                setEditItem(record);
                reset(record);
              }}
            >
              编辑
            </Button>
            <Button variant="text" size="small" color="error" onClick={() => deleteUser(record)}>
              删除
            </Button>
          </Stack>
        );
      },
    },
  ];

  useEffect(() => {
    fetchData(query);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Stack component={Card} sx={{ height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Stack sx={{ fontSize: 14, color: 'text.secondary' }} direction="row" alignItems="center">
          共
          <Typography variant="subtitle2" sx={{ mx: 1, fontFamily: 'Mono' }}>
            {data?.total || 0}
          </Typography>{' '}
          个用户
        </Stack>
        <TextField
          label="用户名"
          value={name}
          size="small"
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              setParams({
                name,
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
        rowKey="id"
        pagination={{
          page,
          pageSize: size,
          total: data?.total || 0,
          onChange: (page: number, size: number) => {
            setParams({
              page,
              size,
            })
          },
        }}
      />
      <Modal
        open={!!editItem}
        onCancel={cancelEdit}
        sx={{
          py: 2,
        }}
        title="编辑用户"
        onOk={putUser}
      >
        <FormControl fullWidth sx={{ my: 2 }}>
          <TextField
            {...register('name')}
            label="用户名"
            required
            slotProps={{
              inputLabel: {
                shrink: !watch('name') || undefined,
              },
            }}
          />
        </FormControl>

        <FormControl fullWidth sx={{ my: 2 }}>
          <InputLabel id="select-label">角色</InputLabel>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select
                labelId="select-label"
                fullWidth
                label="角色"
                {...field}
                onChange={e => field.onChange(Number(e.target.value))}
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
