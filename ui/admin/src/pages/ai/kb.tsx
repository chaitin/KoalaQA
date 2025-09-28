import {
  deleteAdminKbKbIdSpaceSpaceId,
  deleteAdminKbKbIdSpaceSpaceIdFolderFolderId,
  getAdminKbKbIdSpace,
  getAdminKbKbIdSpaceSpaceId,
  getAdminKbKbIdSpaceSpaceIdFolder,
  getAdminKbKbIdSpaceSpaceIdRemote,
  postAdminKbKbIdSpace,
  postAdminKbKbIdSpaceSpaceIdFolder,
  putAdminKbKbIdSpaceSpaceId,
  putAdminKbKbIdSpaceSpaceIdFolderFolderId,
  putAdminKbKbIdSpaceSpaceIdRefresh,
  SvcCreateSpaceReq,
  SvcListSpaceItem,
  SvcListSpaceKBItem,
  SvcUpdateSpaceReq,
} from '@/api';
import Card from '@/components/card';
import LoadingButton from '@/components/LoadingButton';
import { message, Modal } from '@ctzhian/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import GetAppIcon from '@mui/icons-material/GetApp';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid2 as Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useSearchParams } from 'react-router-dom';
import z from 'zod';

const spaceSchema = z.object({
  title: z.string().min(1, '标题必填').default(''),
  url: z.string().min(1, '后台地址必填').default(''),
  access_token: z.string().min(1, 'API Token 必填').default(''),
});

const KnowledgeBasePage = () => {
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentSpace, setCurrentSpace] = useState<SvcListSpaceItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editSpace, setEditSpace] = useState<SvcListSpaceItem | null>(null);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [docDetails, setDocDetails] = useState<Record<string, SvcListSpaceKBItem[]>>({});
  const [searchParams] = useSearchParams();
  const kb_id = +searchParams.get('id')!;

  // 获取知识库空间列表
  const { data: spacesData, refresh: refreshSpaces } = useRequest(
    () => getAdminKbKbIdSpace(kb_id),
    {
      onSuccess: data => {
        // 如果当前没有选中任何知识源，且有知识源数据，则默认选中第一个
        if (
          selectedSpaceId === null &&
          data?.items &&
          data.items.length > 0 &&
          data.items[0].id !== undefined
        ) {
          setSelectedSpaceId(data.items[0].id!);
        }
      },
    }
  );

  // 获取选中空间的文件夹列表
  const {
    data: foldersData,
    refresh: refreshFolders,
    loading: foldersLoading,
  } = useRequest(
    () =>
      selectedSpaceId
        ? getAdminKbKbIdSpaceSpaceIdFolder(kb_id, selectedSpaceId)
        : Promise.resolve(null),
    {
      refreshDeps: [selectedSpaceId],
    }
  );

  // 获取远程知识库列表
  const { data: remoteData, run: fetchRemoteSpaces } = useRequest(
    (id: number) => getAdminKbKbIdSpaceSpaceIdRemote({ kbId: kb_id, spaceId: id }),
    {
      manual: true,
    }
  );

  // 获取知识库详情（用于编辑时获取完整信息）
  const { run: fetchSpaceDetail } = useRequest(
    (spaceId: number) => getAdminKbKbIdSpaceSpaceId(kb_id, spaceId),
    {
      manual: true,
      onSuccess: data => {
        if (data && editSpace) {
          const spaceDetail = data;
          const platformOpt = spaceDetail.platform_opt;
          reset({
            title: spaceDetail.title || '',
            url: platformOpt?.url || '',
            access_token: platformOpt?.access_token || '',
          });
        }
      },
    }
  );

  const spaces = spacesData?.items || [];
  const folders = foldersData?.items || [];

  const { register, formState, handleSubmit, reset } = useForm({
    resolver: zodResolver(spaceSchema),
  });

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, space: SvcListSpaceItem) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setCurrentSpace(space);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setCurrentSpace(null);
  };

  const handleCreateSpace = () => {
    setShowCreateModal(true);
    setEditSpace(null);
    reset(spaceSchema.parse({}));
  };

  const handleEditSpace = () => {
    if (currentSpace) {
      setEditSpace(currentSpace);
      setShowCreateModal(true);
      // 获取完整的知识库详情以填充表单
      fetchSpaceDetail(currentSpace.id || 0);
    }
    handleMenuClose();
  };

  const handleDeleteSpace = () => {
    if (currentSpace) {
      Modal.confirm({
        title: '删除确认',
        content: `确定要删除知识库 "${currentSpace.title}" 吗？`,
        okText: '删除',
        okButtonProps: { color: 'error' },
        onOk: async () => {
          try {
            await deleteAdminKbKbIdSpaceSpaceId(kb_id, currentSpace.id || 0);
            message.success('删除成功');
            refreshSpaces();
            if (selectedSpaceId === currentSpace.id) {
              setSelectedSpaceId(null);
            }
          } catch {
            message.error('删除失败');
          }
        },
      });
    }
    handleMenuClose();
  };

  const handleRefreshSpace = () => {
    if (currentSpace) {
      putAdminKbKbIdSpaceSpaceIdRefresh(kb_id, currentSpace.id || 0)
        .then(() => {
          message.success('更新成功');
          refreshFolders();
        })
        .catch(() => {
          message.error('更新失败');
        });
    }
    handleMenuClose();
  };

  const handleGetSpaces = () => {
    if (currentSpace?.id) {
      setSelectedSpaceId(currentSpace.id || null);
      fetchRemoteSpaces(currentSpace.id);
      setShowImportModal(true);
    }
    handleMenuClose();
  };

  const handleModalCancel = () => {
    setShowCreateModal(false);
    setEditSpace(null);
    reset(spaceSchema.parse({}));
  };

  const handleModalOk = async (data: { title: string; url: string; access_token: string }) => {
    try {
      const platformOpt = {
        url: data.url,
        access_token: data.access_token,
      };

      if (editSpace) {
        const updateData: SvcUpdateSpaceReq = {
          title: data.title,
          opt: platformOpt,
        };
        await putAdminKbKbIdSpaceSpaceId(kb_id, editSpace.id || 0, updateData);
        message.success('修改成功');
      } else {
        const spaceData: SvcCreateSpaceReq = {
          title: data.title,
          platform: 9, // PandaWiki platform type
          opt: platformOpt,
        };
        const newSpaceId = await postAdminKbKbIdSpace(kb_id, spaceData);
        message.success('创建成功');
        // 创建成功后：选中新建空间并打开获取知识库弹窗
        if (typeof newSpaceId === 'number') {
          setSelectedSpaceId(newSpaceId);
          fetchRemoteSpaces(newSpaceId);
          setShowImportModal(true);
        }
      }
      handleModalCancel();
      refreshSpaces();
    } catch {
      message.error('操作失败');
    }
  };

  const handleSpaceClick = (space: SvcListSpaceItem) => {
    setSelectedSpaceId(space.id || null);
  };

  const handleFolderToggle = (folderId?: string) => {
    if (!folderId) return;
    setSelectedFolders(prev =>
      prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  };

  const handleSelectAll = () => {
    const allFolderIds: string[] = [];

    // 只收集 folder 级别的文档 ID（不包含子文档）
    remoteData?.items?.forEach(folder => {
      if (folder.doc_id) {
        allFolderIds.push(folder.doc_id);
      }
    });

    if (selectedFolders.length === allFolderIds.length) {
      setSelectedFolders([]);
    } else {
      setSelectedFolders(allFolderIds);
    }
  };

  const handleImportFolders = async () => {
    if (!selectedSpaceId) return;
    if (selectedFolders.length === 0) {
      message.warning('请选择要导入的文档');
      return;
    }
    try {
      await postAdminKbKbIdSpaceSpaceIdFolder(kb_id, selectedSpaceId, {
        docs: remoteData?.items?.filter(i => selectedFolders.includes(i.doc_id || '')) || [],
      });
      // 刷新文件夹列表
      refreshFolders();
    } catch (error) {
      message.error('导入失败: ' + error);
      return;
    }

    message.success('导入学习已开始');
    setShowImportModal(false);
    setSelectedFolders([]);
  };

  // 获取文档详情
  const handleGetDocDetails = async (spaceId?: string) => {
    if (!spaceId) return;
    if (!selectedSpaceId) return;

    try {
      const response = await getAdminKbKbIdSpaceSpaceIdRemote({
        kbId: kb_id,
        spaceId: selectedSpaceId,
        remote_folder_id: spaceId,
      });

      if (response?.items && spaceId) {
        setDocDetails(prev => ({
          ...prev,
          [spaceId]: response.items || [],
        }));

        // 切换展开状态
        setExpandedDocs(prev => {
          const newSet = new Set(prev);
          if (newSet.has(spaceId)) {
            newSet.delete(spaceId);
          } else {
            newSet.add(spaceId);
          }
          return newSet;
        });
      }
    } catch (error) {
      message.error('获取文档详情失败');
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    return dayjs(timestamp * 1000).format('YYYY-MM-DD HH:mm:ss');
  };

  const getPlatformLabel = (platform?: number) => {
    switch (platform) {
      case 9:
        return 'PandaWiki';
      case 2:
        return '飞书';
      case 4:
        return 'Notion';
      default:
        return '未知';
    }
  };
  return (
    <Card sx={{ flex: 1, height: '100%', overflow: 'auto' }}>
      {/* 标题和创建按钮 */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="body2">共 {spaces.length} 个知识库</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateSpace}>
          关联知识库
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {/* 左侧知识源列表 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', height: 'fit-content' }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              知识源
            </Typography>
            <Stack spacing={1}>
              {spaces.map(space => (
                <Card
                  key={space.id}
                  sx={{
                    border: '1px solid',
                    borderColor: selectedSpaceId === space.id ? 'primary.main' : 'divider',
                    bgcolor: selectedSpaceId === space.id ? 'primary.50' : 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'primary.main',
                    },
                  }}
                  onClick={() => handleSpaceClick(space)}
                >
                  <Stack spacing={1} sx={{ flex: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {space.title}
                      </Typography>
                      <IconButton size="small" onClick={e => handleMenuClick(e, space)}>
                        <MoreHorizIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Chip
                        label={getPlatformLabel(space.platform)}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {space.total || 0} 个知识库
                      </Typography>
                    </Stack>
                  </Stack>
                </Card>
              ))}
              {spaces.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    暂无知识源，点击右上角按钮创建
                  </Typography>
                </Box>
              )}
            </Stack>
          </Card>
        </Grid>

        {/* 右侧文档列表 */}
        <Grid size={{ xs: 12, md: 8 }}>
          {selectedSpaceId ? (
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  知识库列表
                </Typography>
              </Stack>
              <Stack spacing={1}>
                {folders.map(folder => (
                  <Card
                    key={folder.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <DescriptionIcon color="action" />
                      <Stack sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {folder.title}
                          </Typography>
                          <Typography variant="caption">
                            （共 {folder.total || 0} 个文档）
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          更新于 {dayjs((folder.updated_at || 0) * 1000).fromNow()},
                          {formatDate(folder.updated_at)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={folder.status === 1 ? '应用中' : '同步中'}
                          size="small"
                          color={folder.status === 1 ? 'success' : 'warning'}
                          variant="outlined"
                        />
                        <LoadingButton
                          size="small"
                          onClick={async e => {
                            e.stopPropagation();
                            if (!selectedSpaceId || !folder.id) return;

                            try {
                              await putAdminKbKbIdSpaceSpaceIdFolderFolderId(
                                kb_id,
                                selectedSpaceId,
                                folder.id
                              );
                              message.success('更新成功');
                              refreshFolders();
                            } catch {
                              message.error('更新失败');
                            }
                          }}
                        >
                          <RefreshIcon fontSize="small" />
                        </LoadingButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={async e => {
                            e.stopPropagation();
                            if (!selectedSpaceId || !folder.id) return;

                            Modal.confirm({
                              title: '删除确认',
                              content: `确定要删除文件夹 "${folder.title}" 吗？`,
                              okText: '删除',
                              okButtonProps: { color: 'error' },
                              onOk: async () => {
                                try {
                                  // 确保 folder.id 存在
                                  if (folder.id) {
                                    await deleteAdminKbKbIdSpaceSpaceIdFolderFolderId(
                                      kb_id,
                                      selectedSpaceId,
                                      folder.id
                                    );
                                    message.success('删除成功');
                                    refreshFolders();
                                  }
                                } catch {
                                  message.error('删除失败');
                                }
                              },
                            });
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Card>
                ))}
                {folders.length === 0 && !foldersLoading && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      该知识库暂无文档
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Card>
          ) : (
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <FolderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  请选择知识源
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  从左侧列表中选择一个知识源查看其文档
                </Typography>
              </Box>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* 知识源操作菜单 */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleRefreshSpace}>
          <RefreshIcon fontSize="small" sx={{ mr: 1 }} />
          更新
        </MenuItem>
        <MenuItem onClick={handleGetSpaces}>
          <GetAppIcon fontSize="small" sx={{ mr: 1 }} />
          获取知识库
        </MenuItem>
        <MenuItem onClick={handleEditSpace}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          编辑
        </MenuItem>
        <MenuItem onClick={handleDeleteSpace} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          删除
        </MenuItem>
      </Menu>

      {/* 创建/编辑连接模态框 */}
      <Modal
        open={showCreateModal}
        onCancel={handleModalCancel}
        title={editSpace ? '编辑知识库' : '关联知识库'}
        onOk={handleSubmit(handleModalOk)}
      >
        <Stack spacing={3}>
          <TextField
            {...register('title')}
            label="标题"
            fullWidth
            placeholder="请输入知识库标题"
            error={Boolean(formState.errors.title?.message)}
            helperText={formState.errors.title?.message}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            {...register('url')}
            label="PandaWiki 后台地址"
            fullWidth
            placeholder="https://your-pandawiki.com"
            error={Boolean(formState.errors.url?.message)}
            helperText={formState.errors.url?.message}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            {...register('access_token')}
            label="API Token"
            fullWidth
            placeholder="请输入 API Token"
            error={Boolean(formState.errors.access_token?.message)}
            helperText={formState.errors.access_token?.message}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </Modal>

      {/* 获取知识库模态框 */}
      <Modal
        open={showImportModal}
        onCancel={() => setShowImportModal(false)}
        title="获取知识库"
        onOk={handleImportFolders}
        width={600}
      >
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={(() => {
                  const allFolderIds: string[] = [];
                  remoteData?.items?.forEach(folder => {
                    if (folder.doc_id) allFolderIds.push(folder.doc_id);
                  });
                  return selectedFolders.length === allFolderIds.length && allFolderIds.length > 0;
                })()}
                indeterminate={(() => {
                  const allFolderIds: string[] = [];
                  remoteData?.items?.forEach(folder => {
                    if (folder.doc_id) allFolderIds.push(folder.doc_id);
                  });
                  return selectedFolders.length > 0 && selectedFolders.length < allFolderIds.length;
                })()}
                onChange={handleSelectAll}
              />
            }
            label="全选"
          />
          <List>
            {remoteData?.items?.map(
              folder =>
                folder.doc_id && (
                  <Box key={folder.doc_id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Checkbox
                          checked={selectedFolders.includes(folder.doc_id)}
                          onChange={() => handleFolderToggle(folder.doc_id)}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={folder.title}
                        secondary={
                          folder.doc_id &&
                          expandedDocs.has(folder.doc_id) &&
                          docDetails[folder.doc_id]
                            ? `${docDetails[folder.doc_id].length} 个文档`
                            : ''
                        }
                      />
                      {expandedDocs.has(folder.doc_id) ? (
                        <LoadingButton
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            setExpandedDocs(prev => {
                              const newSet = new Set(prev);
                              if (folder.doc_id) {
                                newSet.delete(folder.doc_id);
                              }
                              return newSet;
                            })
                          }
                        >
                          收起文档
                        </LoadingButton>
                      ) : (
                        <LoadingButton
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            if (folder.doc_id && !docDetails[folder.doc_id]) {
                              handleGetDocDetails(folder.doc_id);
                            } else if (folder.doc_id) {
                              setExpandedDocs(prev => {
                                const newSet = new Set(prev);
                                newSet.add(folder.doc_id!);
                                return newSet;
                              });
                            }
                          }}
                        >
                          获取文档
                        </LoadingButton>
                      )}
                    </ListItem>

                    {/* 展开的文档详情 */}
                    {folder.doc_id &&
                      expandedDocs.has(folder.doc_id) &&
                      docDetails[folder.doc_id] && (
                        <Box sx={{ ml: 4, mb: 2 }}>
                          {folder.doc_id &&
                            docDetails[folder.doc_id].map(doc => (
                              <Box
                                key={doc.doc_id}
                                sx={{
                                  p: 1.5,
                                  mb: 1,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: 1,
                                  bgcolor: 'grey.50',
                                }}
                              >
                                <Stack direction="row" alignItems="center" spacing={2}>
                                  <DescriptionIcon
                                    fontSize="small"
                                    sx={{ color: 'text.secondary' }}
                                  />
                                  <Stack sx={{ flex: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {doc.title}
                                    </Typography>
                                    {doc.desc && (
                                      <Typography variant="caption" color="text.secondary">
                                        {doc.desc}
                                      </Typography>
                                    )}
                                  </Stack>
                                </Stack>
                              </Box>
                            ))}
                        </Box>
                      )}
                  </Box>
                )
            )}
          </List>
        </Box>
      </Modal>
    </Card>
  );
};

export default KnowledgeBasePage;
