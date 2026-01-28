import {
  deleteAdminUserUserId,
  getAdminUser,
  getAdminUserReview,
  ModelUserRole,
  postAdminUserJoinOrg,
  putAdminUserUserId,
  SvcOrgListItem,
  SvcUserListItem,
} from '@/api';
import UserReviewModal from '@/components/UserReviewModal';
import { useListQueryParams } from '@/hooks/useListQueryParams';
import { message, Modal, Table } from '@ctzhian/ui';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Visibility from '@mui/icons-material/Visibility';
import Shuffle from '@mui/icons-material/Shuffle';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
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
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { aesCbcEncrypt } from '@/utils/aes';

const transRole: Record<ModelUserRole, string> = {
  [ModelUserRole.UserRoleUnknown]: '未知',
  [ModelUserRole.UserRoleAdmin]: '管理员',
  [ModelUserRole.UserRoleOperator]: '客服运营',
  [ModelUserRole.UserRoleUser]: '用户',
  [ModelUserRole.UserRoleGuest]: '游客',
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
      password: '',
      email: '',
      org_ids: [] as number[],
    },
  });
  const [name, setName] = useState(query.name);
  const [email, setEmail] = useState(query.email);
  const [orgIdFilter, setOrgIdFilter] = useState<number | undefined>(
    query.org_id ? Number(query.org_id) : undefined
  );
  const [roleFilter, setRoleFilter] = useState<ModelUserRole | undefined>(
    query.role ? Number(query.role) as ModelUserRole : undefined
  );
  const [editItem, setEditItem] = useState<UserListItemWithOrgs | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [joinOrgModalOpen, setJoinOrgModalOpen] = useState(false);
  const [joinOrgSelectedOrgs, setJoinOrgSelectedOrgs] = useState<number[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const cancelEdit = () => {
    setEditItem(null);
    reset();
    setValue('org_ids', []);
  };

  // 监听角色字段变化
  const currentRole = watch('role');

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

  // 获取待审批数量
  const { data: pendingReviewCount, run: fetchPendingReviewCount } = useRequest(() =>
    getAdminUserReview({
      page: 1,
      size: 1,
      state: [0], // 待审核状态
    })
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
    const newEmail = query.email || '';
    if (newEmail !== email) {
      setEmail(newEmail);
    }
    const newRoleFilter = query.role ? Number(query.role) as ModelUserRole : undefined;
    if (newRoleFilter !== roleFilter) {
      setRoleFilter(newRoleFilter);
    }
  }, [query.org_id, query.name, query.email, query.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData({
      ...query,
      org_id: orgIdFilter,
      role: roleFilter,
    });
  }, [query, orgIdFilter, roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // 当角色改为游客时，自动设置为 builtin 组织
  useEffect(() => {
    if (currentRole === ModelUserRole.UserRoleGuest) {
      // 查找 builtin 为 true 的组织
      const builtinOrg = orgList.find(org => org.builtin === true);
      if (builtinOrg?.id) {
        setValue('org_ids', [builtinOrg.id]);
      }
    }
  }, [currentRole, orgList, setValue]);

  const getFrontendProfileUrl = useCallback((userId?: number) => {
    if (!userId || typeof window === 'undefined') {
      return undefined;
    }

    if (process.env.NODE_ENV === 'development') {
      return `${window.location.protocol}//${window.location.hostname}:3000/profile/${userId}`;
    }

    return `${window.location.origin}/profile/${userId}`;
  }, []);

  const openFrontendProfile = useCallback((userId?: number) => {
    const url = getFrontendProfileUrl(userId);
    if (!url) {
      message.warning('无法打开前台用户页面');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [getFrontendProfileUrl]);

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
          setParams({ page: 1 });
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
        org_ids: orgIds,
        ...(data.password ? { password: aesCbcEncrypt(data.password) } : {}),
        ...(data.email ? { email: data.email } : {}),
      };

      // 更新用户基本信息
      putAdminUserUserId({ userId: editItem.id! }, updateData)
        .then(() => {
          message.success('修改成功');
          fetchData({
            ...query,
            org_id: orgIdFilter,
            role: roleFilter,
          });
          cancelEdit();
        })
        .catch(err => {
          console.error('更新用户失败:', err);
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
        message.success('批量编辑组织成功');
        setJoinOrgModalOpen(false);
        setJoinOrgSelectedOrgs([]);
        setSelectedRowKeys([]);
        fetchOrgList();
        fetchData({
          ...query,
          org_id: orgIdFilter,
          role: roleFilter,
        });
      })
      .catch(err => {
        console.error('批量编辑组织失败:', err);
        message.error('批量编辑组织失败');
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
        <Stack direction="row" alignItems="center" sx={{ width: '100%', pl: 2 }}>
          {selectedRowKeys.length > 0 && (
            <Button variant="contained" size="small" onClick={() => setJoinOrgModalOpen(true)}>
              编辑组织 ({selectedRowKeys.length})
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
              onClick={() => openFrontendProfile(record.id)}
            >
              前台查看
            </Button>
            <Button
              variant="text"
              size="small"
              color="info"
              onClick={() => {
                const userRecord = record as UserListItemWithOrgs;
                setEditItem(userRecord);
                const orgIds = userRecord.org_ids || (userRecord.org_id ? [userRecord.org_id] : []);
                reset({
                  ...userRecord,
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
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
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
                  email,
                  org_id: orgIdFilter,
                  role: roleFilter,
                });
              }
            }}
          />
          <TextField
            label="邮箱"
            value={email}
            size="small"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setSearch({
                  name,
                  email,
                  org_id: orgIdFilter,
                  role: roleFilter,
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
                  email,
                  org_id: value,
                  role: roleFilter,
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
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="role-filter-label">角色</InputLabel>
            <Select
              labelId="role-filter-label"
              label="角色"
              value={roleFilter !== undefined ? String(roleFilter) : ''}
              onChange={e => {
                const value = e.target.value === '' ? undefined : Number(e.target.value) as ModelUserRole;
                setRoleFilter(value);
                setSearch({
                  name,
                  email,
                  org_id: orgIdFilter,
                  role: value,
                });
              }}
            >
              <MenuItem value="">全部</MenuItem>
              {Object.entries(transRole)
                .slice(1, -1)
                .map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    {value}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Stack>
        <Badge badgeContent={pendingReviewCount?.total || 0} color="error">
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setReviewModalOpen(true);
            }}
          >
            用户审批
          </Button>
        </Badge>
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
          <TextField
            {...register('email')}
            label="邮箱"
            required
            slotProps={{
              inputLabel: {
                shrink: !watch('email') || undefined,
              },
            }}
          />
        </FormControl>
        <FormControl fullWidth sx={{ my: 2 }}>
          <TextField
            {...register('password')}
            label="密码"
            type={showPassword ? 'text' : 'password'}
            slotProps={{
              inputLabel: {
                shrink: !!watch('password') || undefined,
              },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconButton
                        size="small"
                        aria-label="生成随机密码"
                        onClick={async () => {
                          const chars =
                            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                          let password = '';
                          for (let i = 0; i < 6; i++) {
                            password += chars.charAt(Math.floor(Math.random() * chars.length));
                          }
                          setValue('password', password);
                          try {
                            await navigator.clipboard.writeText(password);
                            message.success('已生成随机密码并复制到剪贴板');
                          } catch (err) {
                            // 如果复制失败，仍然显示成功消息（至少密码已经生成）
                            console.error('复制到剪贴板失败:', err);
                            message.success('已生成随机密码');
                          }
                        }}
                      >
                        <Shuffle fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label="切换密码可见性"
                        onClick={() => setShowPassword(!showPassword)}
                        onMouseDown={event => event.preventDefault()}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </Stack>
                  </InputAdornment>
                ),
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
          <InputLabel
            id="org-select-label"
            disabled={currentRole === ModelUserRole.UserRoleGuest || (editItem?.builtin && editItem.role === ModelUserRole.UserRoleAdmin)}
          >
            组织
          </InputLabel>
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
                  disabled={currentRole === ModelUserRole.UserRoleGuest || (editItem?.builtin && editItem.role === ModelUserRole.UserRoleAdmin)}
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
                {fieldState.error && (
                  <FormHelperText sx={{ color: 'error.main' }}>
                    {fieldState.error.message}
                  </FormHelperText>
                )}
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

      {/* 批量编辑组织弹窗 */}
      <Modal
        open={joinOrgModalOpen}
        onCancel={() => {
          setJoinOrgModalOpen(false);
          setJoinOrgSelectedOrgs([]);
        }}
        title="编辑组织"
        onOk={handleBatchJoinOrg}
        sx={{
          py: 2,
        }}
      >
        <FormControl fullWidth sx={{ my: 2 }}>
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

      {/* 用户审批弹窗 */}
      <UserReviewModal
        open={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          fetchPendingReviewCount();
        }}
      />
    </>
  );
};

export default UserList;
