import {
  deleteAdminOrgOrgId,
  getAdminForum,
  getAdminOrg,
  ModelForumInfo,
  ModelOrgType,
  postAdminOrg,
  putAdminOrgOrgId,
  SvcOrgListItem,
  SvcOrgUpsertReq,
} from '@/api';
import { message, Modal, Table } from '@ctzhian/ui';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
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
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface OrgListProps {
  orgList: SvcOrgListItem[];
  onRefresh?: () => void;
}

const OrgList = ({ orgList: initialOrgList, onRefresh }: OrgListProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orgEditItem, setOrgEditItem] = useState<SvcOrgListItem | null>(null);
  const [orgCreateModalOpen, setOrgCreateModalOpen] = useState(false);
  const {
    reset: resetOrgForm,
    register: registerOrg,
    handleSubmit: handleOrgSubmit,
    watch: watchOrg,
    control: controlOrg,
  } = useForm<SvcOrgUpsertReq>({
    defaultValues: {
      name: '',
      forum_ids: [] as number[],
    },
  });

  // 获取组织列表（用于刷新）
  const {
    data: orgListData,
    loading: orgLoading,
    run: fetchOrgList,
  } = useRequest(params => getAdminOrg(params), { manual: true });

  // 获取论坛列表（用于组织访问权限选择）
  const { data: forumListData, run: fetchForumList } = useRequest(
    () => getAdminForum().then(res => (Array.isArray(res) ? res : [])),
    {
      manual: true,
    }
  );

  useEffect(() => {
    fetchForumList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelOrgEdit = () => {
    setOrgEditItem(null);
    setOrgCreateModalOpen(false);
    resetOrgForm({
      name: '',
      forum_ids: [],
    });
  };

  const handleOrgSubmitForm = handleOrgSubmit(data => {
    const isEdit = !!orgEditItem;
    const submitData: SvcOrgUpsertReq = {
      ...data,
    };

    const request =
      isEdit && orgEditItem?.id
        ? putAdminOrgOrgId({ orgId: orgEditItem.id }, submitData)
        : postAdminOrg(submitData);

    request
      .then(() => {
        message.success(isEdit ? '修改成功' : '创建成功');
        fetchOrgList({});
        onRefresh?.();
        cancelOrgEdit();
      })
      .catch(err => {
        console.error('操作失败:', err);
        message.error('操作失败');
      });
  });

  const deleteOrg = (item: SvcOrgListItem) => {
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
        deleteAdminOrgOrgId({ orgId: item.id! }).then(() => {
          message.success('删除成功');
          fetchOrgList({});
          onRefresh?.();
        });
      },
    });
  };

  // 组织列表列定义
  const orgColumns: ColumnsType<SvcOrgListItem> = [
    {
      title: '组织',
      dataIndex: 'name',
      render: (_, record) => {
        const name = record.name || '-';
        const id = record.id;
        return (
          <Box display="flex" flexDirection="column">
            <Typography variant="body2">{name}</Typography>
            {id && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                ID: {id}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      title: '访问权限',
      dataIndex: 'forum_names',
      render: (_, record) => {
        const forumNames = record.forum_names || [];
        if (forumNames.length === 0) {
          return (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              -
            </Typography>
          );
        }
        return (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
            {forumNames.map((name, idx) => (
              <Chip key={idx} label={name} size="small" sx={{ height: 24, fontSize: '12px' }} />
            ))}
          </Stack>
        );
      },
    },
    {
      title: '成员数量',
      dataIndex: 'count',
      render: (_, record) => {
        const count = record.count || 0;
        const handleClick = (e: React.MouseEvent) => {
          e.preventDefault();
          const newParams = new URLSearchParams(searchParams);
          // 切换到用户标签页（删除 tab=org）
          newParams.delete('tab');
          // 设置组织筛选
          if (record.id) {
            newParams.set('org_id', String(record.id));
          }
          // 重置页码到第一页
          newParams.set('page', '1');
          navigate({ search: newParams.toString() }, { replace: true });
        };
        return (
          <Link
            component="button"
            onClick={handleClick}
            sx={{
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'info.main',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {count}
          </Link>
        );
      },
    },
    {
      title: '',
      dataIndex: 'opt',
      render: (_, record) => {
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button
              variant="text"
              size="small"
              color="info"
              onClick={() => {
                setOrgEditItem(record);
                resetOrgForm({
                  name: record.name || '',
                  forum_ids: record.forum_ids || [],
                });
              }}
            >
              编辑
            </Button>
            {!record.builtin && (
              <Button variant="text" size="small" color="error" onClick={() => deleteOrg(record)}>
                删除
              </Button>
            )}
          </Stack>
        );
      },
    },
  ];

  // 将内置组织放到最前面
  const displayOrgList = useMemo(() => {
    const items = orgListData?.items || initialOrgList || [];
    return [...items].sort((a, b) => {
      const aBuiltin = a.builtin ? 1 : 0;
      const bBuiltin = b.builtin ? 1 : 0;
      return bBuiltin - aBuiltin; // builtin为true的排在前面
    });
  }, [orgListData?.items, initialOrgList]);
  const forumOptions: ModelForumInfo[] = forumListData || [];

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Stack sx={{ fontSize: 14, color: 'text.secondary' }} direction="row" alignItems="center">
          共
          <Typography variant="subtitle2" sx={{ mx: 1, fontFamily: 'Mono' }}>
            {orgListData?.total || initialOrgList.length || 0}
          </Typography>{' '}
          个组织
        </Stack>
        <Button
          variant="contained"
          size="small"
          onClick={() => {
            setOrgEditItem(null);
            setOrgCreateModalOpen(true);
            resetOrgForm({
              name: '',
              forum_ids: [],
            });
          }}
        >
          创建组织
        </Button>
      </Stack>
      <Table
        sx={{ mx: -2, flex: 1, overflow: 'auto' }}
        PaginationProps={{
          sx: {
            pt: 2,
            mx: 2,
          },
        }}
        loading={orgLoading}
        columns={orgColumns}
        dataSource={displayOrgList}
        rowKey="id"
        pagination={false}
      />

      {/* 创建/编辑组织弹窗 */}
      <Modal
        open={orgCreateModalOpen || !!orgEditItem}
        onCancel={cancelOrgEdit}
        sx={{
          py: 2,
        }}
        title={orgEditItem ? '编辑组织' : '创建组织'}
        onOk={handleOrgSubmitForm}
      >
        <FormControl fullWidth sx={{ my: 2 }}>
          <TextField
            {...registerOrg('name', { required: '组织名称必填' })}
            label="组织名称"
            required
            disabled={orgEditItem?.builtin}
            slotProps={{
              inputLabel: {
                shrink: !!watchOrg('name'),
              },
            }}
          />
        </FormControl>

        <FormControl fullWidth sx={{ my: 2 }}>
          <InputLabel
            id="forum-select-label"
            disabled={orgEditItem?.type === ModelOrgType.OrgTypeAdmin}
          >
            访问权限
          </InputLabel>
          <Controller
            name="forum_ids"
            control={controlOrg}
            render={({ field }) => (
              <Select
                labelId="forum-select-label"
                fullWidth
                label="访问权限"
                multiple
                disabled={orgEditItem?.type === ModelOrgType.OrgTypeAdmin}
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
                    .map(id => forumOptions.find(forum => forum.id === id)?.name || `论坛ID: ${id}`)
                    .join(', ');
                }}
              >
                {forumOptions.map(forum => (
                  <MenuItem key={forum.id} value={forum.id}>
                    <Checkbox checked={(field.value || []).includes(forum.id || 0)} />
                    {forum.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>
      </Modal>
    </>
  );
};

export default OrgList;
