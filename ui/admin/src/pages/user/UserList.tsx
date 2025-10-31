import {
  deleteAdminUserUserId,
  getAdminUser,
  ModelUserRole,
  postAdminUserJoinOrg,
  putAdminUserUserId,
  SvcOrgListItem,
  SvcUserListItem,
} from '@/api';
import { useListQueryParams } from '@/hooks/useListQueryParams';
import { message, Modal, Table } from '@ctzhian/ui';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  Link,
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

// 扩展用户列表项，包含组织信息
interface UserListItemWithOrgs extends SvcUserListItem {
  org_id?: number;
  org_name?: string;
  org_ids?: number[];
  org_names?: string[];
}

interface UserListProps {
  orgList: SvcOrgListItem[];
  fetchOrgList: () => void;
}

const UserList = ({ orgList, fetchOrgList }: UserListProps) => {
  const { query, page, size, setParams, setSearch } = useListQueryParams();
  const { reset, register, handleSubmit, watch, control, setValue } = useForm({
    defaultValues: {
      name: '',
      role: 1,
      org_ids: [] as number[],
    },
  });
  const [name, setName] = useState(query.name);
  const [orgIdFilter, setOrgIdFilter] = useState<number | undefined>(
    query.org_id ? Number(query.org_id) : undefined
  );
  const [editItem, setEditItem] = useState<UserListItemWithOrgs | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [joinOrgModalOpen, setJoinOrgModalOpen] = useState(false);
  const [joinOrgSelectedOrgs, setJoinOrgSelectedOrgs] = useState<number[]>([]);

  const cancelEdit = () => {
    setEditItem(null);
    reset();
    setValue('org_ids', []);
  };

  const {
    data,
    loading,
    run: fetchData,
  } = useRequest(
    params =>
      getAdminUser({
        ...params,
        org_id: params.org_id || undefined,
      }),
    { manual: true }
  );

  // 当 URL 参数变化时，更新本地状态
  useEffect(() => {
    const newOrgIdFilter = query.org_id ? Number(query.org_id) : undefined;
    if (newOrgIdFilter !== orgIdFilter) {
      setOrgIdFilter(newOrgIdFilter);
    }
    const newName = query.name || '';
    if (newName !== name) {
      setName(newName);
    }
  }, [query.org_id, query.name]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData({
      ...query,
      org_id: orgIdFilter,
    });
  }, [query, orgIdFilter]); // eslint-disable-line react-hooks/exhaustive-deps

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
        deleteAdminUserUserId({ userId: item.id! }).then(() => {
          message.success('删除成功');
          fetchOrgList();
          fetchData({
            page: 1,
          });
        });
      },
    });
  };

  const putUser = handleSubmit(data => {
    if (editItem) {
      const orgIds = data.org_ids || [];
      const orgOptions = orgList || [];
      if (orgIds.length === 0 && orgOptions.length > 0) {
        message.error('用户至少需要属于一个组织');
        return;
      }

      const updateData = {
        name: data.name,
        role: data.role,
      };

      // 更新用户基本信息
      putAdminUserUserId({ userId: editItem.id! }, updateData)
        .then(() => {
          // 如果组织列表有变化，更新用户与组织的关系
          const originalOrgIds = editItem.org_ids || (editItem.org_id ? [editItem.org_id] : []);
          const newOrgIds = orgIds.sort((a, b) => a - b);
          const sortedOriginalOrgIds = [...originalOrgIds].sort((a, b) => a - b);
          
          // 检查组织列表是否发生变化
          const orgIdsChanged = 
            newOrgIds.length !== sortedOriginalOrgIds.length ||
            !newOrgIds.every((id, idx) => id === sortedOriginalOrgIds[idx]);
          
          if (orgIdsChanged && orgIds.length > 0) {
            // 更新用户与组织的关系
            return postAdminUserJoinOrg({
              user_ids: [editItem.id!],
              org_ids: orgIds,
            });
          }
          return Promise.resolve();
        })
        .then(() => {
          message.success('修改成功');
          fetchData({
            ...query,
            org_id: orgIdFilter,
          });
          fetchOrgList();
          cancelEdit();
        })
        .catch(err => {
          console.error('更新用户失败:', err);
          message.error('更新用户失败');
        });
    }
  });

  const handleBatchJoinOrg = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    if (joinOrgSelectedOrgs.length === 0) {
      message.warning('请选择至少一个组织');
      return;
    }

    postAdminUserJoinOrg({
      user_ids: selectedRowKeys.map(key => Number(key)),
      org_ids: joinOrgSelectedOrgs,
    })
      .then(() => {
        message.success('批量加入组织成功');
        setJoinOrgModalOpen(false);
        setJoinOrgSelectedOrgs([]);
        setSelectedRowKeys([]);
        fetchOrgList();
        fetchData({
          ...query,
          org_id: orgIdFilter,
        });
      })
      .catch(err => {
        console.error('批量加入组织失败:', err);
        message.error('批量加入组织失败');
      });
  };

  const columns: ColumnsType<UserListItemWithOrgs> = [
    {
      title: '用户名',
      dataIndex: 'name',
      render: (_, record) => {
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2">{record.name || '-'}</Typography>
            {record.role && (
              <Chip
                label={transRole[record.role]}
                size="small"
                sx={{ height: 20, fontSize: '11px' }}
              />
            )}
          </Stack>
        );
      },
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      render: (_, record) => {
        return record.email || '-';
      },
    },
    {
      title: '组织',
      dataIndex: 'org_name',
      render: (_, record: UserListItemWithOrgs) => {
        const orgNames = record.org_names || (record.org_name ? [record.org_name] : []);
        if (orgNames.length === 0) {
          return (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              -
            </Typography>
          );
        }
        return (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
            {orgNames.map((name, idx) => (
              <Chip key={idx} label={name} size="small" sx={{ height: 24, fontSize: '12px' }} />
            ))}
          </Stack>
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
      title: (
        <Stack direction="row" alignItems="center" sx={{ width: '100%', pl:2 }}>
          {selectedRowKeys.length > 0 && (
            <Button variant="contained" size="small" onClick={() => setJoinOrgModalOpen(true)}>
              加入组织 ({selectedRowKeys.length})
            </Button>
          )}
        </Stack>
      ),
      dataIndex: 'opt',
      render: (_, record) => {
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button
              variant="text"
              size="small"
              color="info"
              onClick={() => {
                const userRecord = record as UserListItemWithOrgs;
                setEditItem(userRecord);
                const orgIds = userRecord.org_ids || (userRecord.org_id ? [userRecord.org_id] : []);
                reset({
                  name: userRecord.name || '',
                  role: userRecord.role || 1,
                  org_ids: orgIds,
                });
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

  const orgOptions = orgList || [];

  return (
    <>
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
              setSearch({
                name,
                org_id: orgIdFilter,
              });
            }
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="org-filter-label">组织名称</InputLabel>
          <Select
            labelId="org-filter-label"
            label="组织名称"
            value={orgIdFilter ? String(orgIdFilter) : ''}
            onChange={e => {
              const value = e.target.value === '' ? undefined : Number(e.target.value);
              setOrgIdFilter(value);
              setSearch({
                name,
                org_id: value,
              });
            }}
          >
            <MenuItem value="">全部</MenuItem>
            {orgOptions.map(org => (
              <MenuItem key={org.id} value={String(org.id)}>
                {org.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
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

        <FormControl fullWidth sx={{ my: 2 }} error={false}>
          <InputLabel id="org-select-label">组织</InputLabel>
          <Controller
            name="org_ids"
            control={control}
            rules={{
              validate: value => {
                if (!value || value.length === 0) {
                  return '用户至少需要属于一个组织';
                }
                return true;
              },
            }}
            render={({ field, fieldState }) => (
              <>
                <Select
                  labelId="org-select-label"
                  fullWidth
                  label="组织"
                  multiple
                  value={field.value || []}
                  onChange={e => {
                    const value = e.target.value as number[];
                    field.onChange(value);
                  }}
                  renderValue={selected => {
                    if (Array.isArray(selected) && selected.length === 0) {
                      return '';
                    }
                    return (selected as number[])
                      .map(id => orgOptions.find(org => org.id === id)?.name || `组织ID: ${id}`)
                      .join(', ');
                  }}
                >
                  {orgOptions.length === 0 ? (
                    <MenuItem disabled>
                      <Stack spacing={1}>
                        <Typography variant="body2">暂无组织</Typography>
                        <Link
                          component="button"
                          variant="body2"
                          onClick={() => {
                            cancelEdit();
                            message.info('请先创建组织');
                          }}
                          sx={{ textDecoration: 'underline' }}
                        >
                          前往创建组织
                        </Link>
                      </Stack>
                    </MenuItem>
                  ) : (
                    orgOptions.map(org => (
                      <MenuItem key={org.id} value={org.id}>
                        <Checkbox checked={(field.value || []).includes(org.id || 0)} />
                        {org.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
                {fieldState.error && <FormHelperText>{fieldState.error.message}</FormHelperText>}
                {orgOptions.length === 0 && (
                  <FormHelperText>
                    暂无组织，
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => {
                        cancelEdit();
                        message.info('请先创建组织');
                      }}
                      sx={{ textDecoration: 'underline', ml: 0.5 }}
                    >
                      前往创建
                    </Link>
                  </FormHelperText>
                )}
              </>
            )}
          />
        </FormControl>
      </Modal>

      {/* 批量加入组织弹窗 */}
      <Modal
        open={joinOrgModalOpen}
        onCancel={() => {
          setJoinOrgModalOpen(false);
          setJoinOrgSelectedOrgs([]);
        }}
        title="加入组织"
        onOk={handleBatchJoinOrg}
        sx={{
          py: 2,
        }}
      >
        <FormControl fullWidth sx={{ my: 2 }}>
          <InputLabel id="batch-org-select-label">选择组织</InputLabel>
          <Select
            labelId="batch-org-select-label"
            fullWidth
            label="选择组织"
            multiple
            value={joinOrgSelectedOrgs}
            onChange={e => {
              setJoinOrgSelectedOrgs(e.target.value as number[]);
            }}
            renderValue={selected => {
              if (Array.isArray(selected) && selected.length === 0) {
                return '';
              }
              return (selected as number[])
                .map(id => orgOptions.find(org => org.id === id)?.name || `组织ID: ${id}`)
                .join(', ');
            }}
          >
            {orgOptions.map(org => (
              <MenuItem key={org.id} value={org.id}>
                <Checkbox checked={joinOrgSelectedOrgs.includes(org.id || 0)} />
                {org.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          已选择 {selectedRowKeys.length} 个用户
        </Typography>
      </Modal>
    </>
  );
};

export default UserList;
