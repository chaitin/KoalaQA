import {
  deleteAdminUserUserId,
  getAdminUser,
  getAdminUserReview,
  ModelUserRole,
  postAdminUserJoinOrg,
  putAdminUserUserId,
  putAdminUserUserIdBlock,
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
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useRequest } from 'ahooks';
import { ColumnsType } from '@ctzhian/ui/dist/Table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { aesCbcEncrypt } from '@/utils/aes';
import copy from 'copy-to-clipboard';

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
  // 封禁相关状态
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockTarget, setBlockTarget] = useState<SvcUserListItem | null>(null);
  const [blockDuration, setBlockDuration] = useState<'3d' | '7d' | 'forever'>('3d');
  const [blockLoading, setBlockLoading] = useState(false);
  // 操作菜单
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuTarget, setMenuTarget] = useState<SvcUserListItem | null>(null);
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

  const openBlockModal = (item: SvcUserListItem) => {
    setBlockTarget(item);
    setBlockDuration('3d');
    setBlockModalOpen(true);
  };

  const handleBlock = () => {
    if (!blockTarget) return;
    setBlockLoading(true);
    let until: number | undefined;
    const now = Math.floor(Date.now() / 1000);
    if (blockDuration === '3d') until = now + 3 * 24 * 3600;
    else if (blockDuration === '7d') until = now + 7 * 24 * 3600;
    else until = -1; // 永久
    putAdminUserUserIdBlock({ userId: blockTarget.id! }, { until })
      .then(() => {
        message.success('封禁成功');
        setBlockModalOpen(false);
        fetchData({ ...query, org_id: orgIdFilter, role: roleFilter });
      })
      .finally(() => setBlockLoading(false));
  };

  const handleUnblock = (item: SvcUserListItem) => {
    Modal.confirm({
      title: '解封用户',
      okText: '确认解封',
      content: (
        <>
          确定要解封用户
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
            「{item.name}」
          </Box>
          吗？
        </>
      ),
      onOk: () => {
        putAdminUserUserIdBlock({ userId: item.id! }, { until: 0 })
          .then(() => {
            message.success('解封成功');
            fetchData({ ...query, org_id: orgIdFilter, role: roleFilter });
          });
      },
    });
  };

  // 判断用户是否处于封禁状态
  const isBlocked = (item: SvcUserListItem & { block_until?: number }) => {
    if (item.block_until === undefined || item.block_until === null) return false;
    if (item.block_until < 0) return true; // 永久封禁
    if (item.block_until === 0) return false;
    return item.block_until > Math.floor(Date.now() / 1000);
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

            {!!record.block_until && (() => {
              const until = record.block_until!;
              let label: string;
              if (until < 0) {
                label = '永久封禁';
              } else {
                const diffSec = until - Math.floor(Date.now() / 1000);
                if (diffSec <= 0) {
                  label = '封禁已到期';
                } else if (diffSec >= 86400) {
                  label = `${Math.ceil(diffSec / 86400)}天后解封`;
                } else if (diffSec >= 3600) {
                  label = `${Math.ceil(diffSec / 3600)}小时后解封`;
                } else {
                  label = `${Math.ceil(diffSec / 60)}分钟后解封`;
                }
              }
              return (
                <Chip
                  label={label}
                  size="small"
                  color="error"
                  sx={{ height: 20, fontSize: '11px' }}
                />
              );
            })()}

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
        const blocked = isBlocked(record as SvcUserListItem & { blocked_until?: number });
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button
              variant="text"
              size="small"
              color="info"
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
            {blocked && (
              <Chip
                label="封禁中"
                size="small"
                color="error"
                variant="outlined"
                sx={{ height: 20, fontSize: '11px' }}
              />
            )}
            <IconButton
              size="small"
              onClick={e => {
                setMenuAnchorEl(e.currentTarget);
                setMenuTarget(record);
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
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
                            copy(password);
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

      {/* 操作下拉菜单 */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => {
          setMenuAnchorEl(null);
          // 延迟清空，避免关闭动画期间菜单内容闪烁
          setTimeout(() => setMenuTarget(null), 300);
        }}
        sx={{

        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {menuTarget?.block_until ? (
          <MenuItem
            onClick={() => {
              setMenuAnchorEl(null);
              handleUnblock(menuTarget!);
            }}
          >解封
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => {
              setMenuAnchorEl(null);
              openBlockModal(menuTarget!);
            }}
          >封禁
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setMenuAnchorEl(null);
            deleteUser(menuTarget!);
          }}
          sx={{ color: 'error.main' }}
        >
          删除
        </MenuItem>
      </Menu>

      {/* 封禁弹窗 */}
      <Modal
        open={blockModalOpen}
        onCancel={() => setBlockModalOpen(false)}
        title="封禁用户"
        okText="确认封禁"
        okButtonProps={{ disabled: blockLoading }}
        onOk={handleBlock}
        sx={{ py: 2 }}
      >
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          确认封禁用户「<Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{blockTarget?.name}</Box>」，请选择封禁时长：
        </Typography>
        <RadioGroup
          value={blockDuration}
          onChange={e => setBlockDuration(e.target.value as '3d' | '7d' | 'forever')}
        >
          <FormControlLabel value="3d" control={<Radio size="small" />} label="3 天" />
          <FormControlLabel value="7d" control={<Radio size="small" />} label="7 天" />
          <FormControlLabel value="forever" control={<Radio size="small" />} label="永久封禁" />
        </RadioGroup>
      </Modal>
    </>
  );
};

export default UserList;
