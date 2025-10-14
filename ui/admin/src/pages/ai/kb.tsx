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
  SvcListSpaceFolderItem,
  SvcUpdateSpaceReq,
} from '@/api';
import LoadingButton from '@/components/LoadingButton';
import { Card, Icon, message, Modal } from '@ctzhian/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import GetAppIcon from '@mui/icons-material/GetApp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Button,
  Checkbox,
  Divider,
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
import { useSearchParams } from 'react-router-dom';
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
  const [currentFolder, setCurrentFolder] = useState<SvcListSpaceFolderItem | null>(null);
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

  const handleFolderMenuClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    folder: SvcListSpaceFolderItem
  ) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setCurrentFolder(folder);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setCurrentSpace(null);
    setCurrentFolder(null);
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

  const handleRefreshFolder = async () => {
    if (!currentFolder || !selectedSpaceId) return;
    handleMenuClose();

    try {
      await putAdminKbKbIdSpaceSpaceIdFolderFolderId(kb_id, selectedSpaceId, currentFolder.id!);
      message.success('更新成功');
      refreshFolders();
    } catch {
      message.error('更新失败');
    }
  };

  const handleDeleteFolder = async () => {
    if (!currentFolder || !selectedSpaceId) return;
    handleMenuClose();

    Modal.confirm({
      title: '删除确认',
      content: `确定要删除文件夹 "${currentFolder.title}" 吗？`,
      okText: '删除',
      okButtonProps: { color: 'error' },
      onOk: async () => {
        try {
          await deleteAdminKbKbIdSpaceSpaceIdFolderFolderId(
            kb_id,
            selectedSpaceId,
            currentFolder.id!
          );
          message.success('删除成功');
          refreshFolders();
        } catch {
          message.error('删除失败');
        }
      },
    });
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
        docs: (remoteData?.items?.filter(i => i.doc_id && selectedFolders.includes(i.doc_id)) ||
          []) as any,
      });
      // 刷新文件夹列表
      refreshFolders();
    } catch {
      message.error('导入失败');
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
    } catch {
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
    <>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* 左侧知识库分类列表 */}
        <Grid size={{ xs: 12 }} sx={{ height: '100%', width: '373px', flexShrink: 0 }}>
          <Card
            sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'none' }}
          >
            {/* 标题和创建按钮 */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 3 }}
            >
              <Typography variant="body2" sx={{ fontSize: 14, color: 'text.secondary' }}>
                共 {spaces.length} 个知识库
              </Typography>
              <Button variant="contained" onClick={handleCreateSpace}>
                关联知识库
              </Button>
            </Stack>

            {/* 知识库分类列表 */}
            <Stack spacing={2} sx={{ flex: 1, boxShadow: 'none' }}>
              {spaces.map(space => (
                <Box
                  key={space.id}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow:
                      '0px 0px 10px 0px rgba(54,59,76,0.1), 0px 0px 1px 1px rgba(54,59,76,0.03)',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: selectedSpaceId === space.id ? '#3248F2' : 'transparent',
                    '&:hover': {
                      borderColor: '#3248F2',
                      '& .kb_title': {
                        color: '#3860F4',
                      },
                    },
                    ...(selectedSpaceId === space.id && {
                      '& .kb_title': {
                        color: '#3860F4',
                      },
                    }),
                  }}
                  onClick={() => handleSpaceClick(space)}
                >
                  <Box sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Typography variant="subtitle2" className="kb_title" sx={{ fontSize: 16 }}>
                        {space.title}
                      </Typography>
                    </Stack>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ my: 2 }}
                    >
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                        知识库数量
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontSize: '12px', pr: '14px' }}>
                        {space.total || 0}
                      </Typography>
                    </Stack>
                    <Divider sx={{ borderStyle: 'dashed', mb: 2 }} />
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box
                        sx={{
                          background: '#1F2329',
                          border: '1px solid #d0d0d0',
                          borderRadius: '5px',
                          px: 2,
                          py: 0.5,
                          fontSize: '12px',
                          color: '#fff',
                          fontWeight: 400,
                        }}
                      >
                        {getPlatformLabel(space.platform)}
                      </Box>
                      <IconButton
                        size="small"
                        onClick={e => handleMenuClick(e, space)}
                        sx={{
                          color: 'text.secondary',
                          '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                </Box>
              ))}
              {spaces.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="body2" color="text.secondary">
                    暂无知识库，点击右上角按钮创建
                  </Typography>
                </Box>
              )}
            </Stack>
          </Card>
        </Grid>

        {/* 右侧知识库详细列表 */}
        <Grid size={{ xs: 12 }} sx={{ height: '100%', flex: 1, minWidth: 0 }}>
          <Card
            sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'none' }}
          >
            <Typography variant="body1" sx={{ mb: 3, fontWeight: 500, fontSize: '16px' }}>
              知识库列表
            </Typography>

            {selectedSpaceId ? (
              <Stack spacing={2} sx={{ flex: 1, overflow: 'auto' }}>
                {folders.map(folder => (
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={2}
                    key={folder.id}
                    sx={{
                      pl: 3,
                      pr: 2,
                      py: 2,
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: '#f8f9fa',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                      },
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={2}
                    >
                      <Icon
                        type="icon-tongyongwendang-moren"
                        sx={{ color: 'text.secondary', fontSize: 20 }}
                      />
                      <Stack sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 500, fontSize: '14px', mb: 0.5 }}
                        >
                          {folder.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: '12px', mb: 0.5, '& b': { color: 'text.primary' } }}
                        >
                          共 <b>{folder.total || 0}</b> 个文档
                        </Typography>
                      </Stack>
                    </Stack>
                    <Box
                      sx={{
                        backgroundColor:
                          folder.status === 1 ? 'rgba(56, 96, 244, 0.10)' : '#fff3e0',
                        color: folder.status === 1 ? '#3860F4' : '#f57c00',
                        borderRadius: '12px',
                        px: 1.5,
                        py: 0.5,
                        fontSize: '12px',
                        fontWeight: 400,
                      }}
                    >
                      {folder.status === 1 ? '应用中' : '同步中'}
                    </Box>
                    <Stack alignItems="flex-end" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={e => handleFolderMenuClick(e, folder)}
                        sx={{
                          color: 'text.secondary',
                          '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ pr: 1 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: '12px', display: 'block' }}
                        >
                          更新于 {dayjs((folder.updated_at || 0) * 1000).fromNow()}{' '}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: '12px', display: 'block' }}
                        >
                          {formatDate(folder.updated_at)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                ))}
                {folders.length === 0 && !foldersLoading && (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="body2" color="text.secondary">
                      该知识库暂无文档
                    </Typography>
                  </Box>
                )}
              </Stack>
            ) : (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <FolderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  请选择知识库
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  从左侧列表中选择一个知识库查看其文档
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* 操作菜单 */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {currentSpace && !currentFolder && (
          <>
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
          </>
        )}
        {currentFolder && !currentSpace && (
          <>
            <MenuItem onClick={handleRefreshFolder}>
              <RefreshIcon fontSize="small" sx={{ mr: 1 }} />
              更新
            </MenuItem>
            <MenuItem onClick={handleDeleteFolder} sx={{ color: 'error.main' }}>
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
              删除
            </MenuItem>
          </>
        )}
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
    </>
  );
};

export default KnowledgeBasePage;
