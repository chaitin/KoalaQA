import {
  deleteAdminKbKbIdSpaceSpaceId,
  deleteAdminKbKbIdSpaceSpaceIdFolderFolderId,
  getAdminKbKbIdSpace,
  getAdminKbKbIdSpaceSpaceId,
  getAdminKbKbIdSpaceSpaceIdFolder,
  getAdminKbKbIdSpaceSpaceIdRemote,
  postAdminKbKbIdSpace,
  postAdminKbKbIdSpaceSpaceIdFolder,
  postAdminKbSpaceRemote,
  putAdminKbKbIdSpaceSpaceId,
  putAdminKbKbIdSpaceSpaceIdFolderFolderId,
  putAdminKbKbIdSpaceSpaceIdRefresh,
  SvcCreateSpaceReq,
  SvcListRemoteReq,
  SvcListSpaceItem,
  SvcListSpaceKBItem,
  SvcListSpaceFolderItem,
  SvcUpdateSpaceReq,
  PlatformPlatformType,
} from '@/api';
import LoadingButton from '@/components/LoadingButton';
import StatusBadge from '@/components/StatusBadge';
import { Card, Icon, message, Modal } from '@ctzhian/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import GetAppIcon from '@mui/icons-material/GetApp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import dingtalk_screen_1 from '@/assets/images/dingtalk_1.png';
import dingtalk_screen_2 from '@/assets/images/dingtalk_2.png';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid2 as Grid,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
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
  url: z.string().optional(),
  access_token: z.string().optional(),
  app_id: z.string().optional(),
  secret: z.string().optional(),
  phone: z.string().optional(),
  identifier_type: z.enum(['unionid', 'phone']).default('unionid'),
});

const KnowledgeBasePage = () => {
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createMenuAnchorEl, setCreateMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [currentSpace, setCurrentSpace] = useState<SvcListSpaceItem | null>(null);
  const [currentFolder, setCurrentFolder] = useState<SvcListSpaceFolderItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editSpace, setEditSpace] = useState<SvcListSpaceItem | null>(null);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [docDetails, setDocDetails] = useState<Record<string, SvcListSpaceKBItem[]>>({});
  const [selectedPlatform, setSelectedPlatform] = useState<number>(9);
  const [dingtalkStep, setDingtalkStep] = useState<number>(1);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState('');
  const [previewImageAlt, setPreviewImageAlt] = useState('');
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
          const platformOpt = spaceDetail.platform_opt as any;
          setSelectedPlatform(spaceDetail.platform || 0);
          reset({
            title: spaceDetail.title || '',
            url: platformOpt?.url || '',
            access_token: platformOpt?.unionid || platformOpt?.access_token || '',
            app_id: platformOpt?.app_id || '',
            secret: platformOpt?.secret || '',
            phone: platformOpt?.phone || '',
            identifier_type: platformOpt?.identifier_type || 'unionid',
          });
        }
      },
    }
  );

  const spaces = spacesData?.items || [];
  const folders = foldersData?.items || [];

  const { register, formState, handleSubmit, reset, watch, setValue } = useForm({
    resolver: zodResolver(spaceSchema),
  });

  const identifierType = watch('identifier_type');

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, space: SvcListSpaceItem) => {
    event.stopPropagation();
    console.log(space);
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

  const handleCreateMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setCreateMenuAnchorEl(event.currentTarget);
  };

  const handleCreateMenuClose = () => {
    setCreateMenuAnchorEl(null);
  };

  const handleCreateSpace = (platform: number = 9) => {
    setSelectedPlatform(platform);
    setShowCreateModal(true);
    setEditSpace(null);
    reset(spaceSchema.parse({}));
    handleCreateMenuClose();
  };

  const handleCreatePandaWiki = () => {
    handleCreateSpace(9); // PandaWiki platform type
  };

  const handleCreateDingTalk = () => {
    setDingtalkStep(1);
    handleCreateSpace(PlatformPlatformType.PlatformDingtalk); // 钉钉 platform type
  };

  const handleCreateFeishu = () => {
    handleCreateSpace(2); // 飞书 platform type
  };

  // 图片预览处理函数
  const handleImagePreview = (src: string, alt: string) => {
    setPreviewImageSrc(src);
    setPreviewImageAlt(alt);
    setImagePreviewOpen(true);
  };

  const handleImagePreviewClose = () => {
    setImagePreviewOpen(false);
    setPreviewImageSrc('');
    setPreviewImageAlt('');
  };

  const handleEditSpace = () => {
    if (currentSpace) {
      setEditSpace(currentSpace);
      setDingtalkStep(1); // 编辑时只显示第一步
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

  const dingtalkGetSpaces = async () => {
    try {
      // 执行 handleDingtalkNextStep 的逻辑
      const formData = await new Promise((resolve, reject) => {
        handleSubmit(
          data => resolve(data),
          errors => reject(errors)
        )();
      });

      // 创建知识库空间
      const platformOpt = {
        url: (formData as any).url,
        access_token: (formData as any).access_token,
        app_id: (formData as any).app_id,
        secret: (formData as any).secret,
        unionid: (formData as any).access_token,
        phone: (formData as any).phone,
        identifier_type: (formData as any).identifier_type,
      };

      const spaceData: SvcCreateSpaceReq = {
        title: (formData as any).title,
        platform: PlatformPlatformType.PlatformDingtalk,
        opt: platformOpt,
      };

      const newSpaceId = await postAdminKbKbIdSpace(kb_id, spaceData);

      // 成功后执行 dingtalkGetSpaces 逻辑
      setCurrentSpace({ id: newSpaceId });
      setSelectedSpaceId(newSpaceId);
      fetchRemoteSpaces(newSpaceId);
      setShowCreateModal(false);
      setShowImportModal(true);
      refreshSpaces();

      message.success('知识库创建成功');
    } catch (error) {
      console.error('获取知识库失败:', error);
      message.error('获取知识库失败，请检查配置是否正确');
    }
  };
  const handleGetSpaces = () => {
    if (currentSpace?.id) {
      setSelectedSpaceId(currentSpace.id || null);
      fetchRemoteSpaces(currentSpace.id);
      setShowImportModal(true);
      refreshSpaces();
    }
    handleMenuClose();
  };

  const handleModalCancel = () => {
    setShowCreateModal(false);
    setEditSpace(null);
    setDingtalkStep(1);
    reset(spaceSchema.parse({}));
  };

  const handleDingtalkNextStep = async () => {
    try {
      // 先验证表单
      const formData = await new Promise((resolve, reject) => {
        handleSubmit(
          data => resolve(data),
          errors => reject(errors)
        )();
      });

      // 构建平台配置选项
      const platformOpt = {
        access_token: (formData as any).access_token,
        app_id: (formData as any).app_id,
        secret: (formData as any).secret,
        phone: (formData as any).phone,
        url: (formData as any).url,
      };

      // 调用 POST /admin/kb/space/remote 接口
      const requestData: SvcListRemoteReq = {
        platform: PlatformPlatformType.PlatformDingtalk,
        opt: platformOpt,
      };

      await postAdminKbSpaceRemote(requestData);

      // 成功后进入第二步
      setDingtalkStep(2);
    } catch (error) {
      console.error('钉钉配置验证失败:', error);
      message.error('配置验证失败，请检查填写的信息是否正确');
    }
  };

  const handleDingtalkPrevStep = () => {
    setDingtalkStep(1);
  };

  const handleModalOk = async (data: any) => {
    try {
      const platformOpt = {
        url: data.url,
        access_token: data.access_token,
        ...(selectedPlatform === PlatformPlatformType.PlatformDingtalk && {
          app_id: data.app_id,
          secret: data.secret,
          unionid: data.unionid,
          phone: data.phone,
          identifier_type: data.identifier_type,
        }),
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
          platform: selectedPlatform,
          opt: platformOpt,
        };
        const newSpaceId = await postAdminKbKbIdSpace(kb_id, spaceData);
        // 创建成功后：选中新建空间并打开获取知识库弹窗
        if (selectedPlatform === PlatformPlatformType.PlatformDingtalk) {
          console.log(newSpaceId);
          return newSpaceId;
        }
        message.success('创建成功');
        setShowImportModal(true);
        setSelectedSpaceId(newSpaceId);
        fetchRemoteSpaces(newSpaceId);
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
      case PlatformPlatformType.PlatformPandawiki:
        return 'PandaWiki';
      case PlatformPlatformType.PlatformFeishu:
        return '飞书';
      case PlatformPlatformType.PlatformDingtalk:
        return '钉钉';
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
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'none',
            }}
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
              <Button variant="contained" onClick={handleCreateMenuClick}>
                关联知识库
              </Button>
            </Stack>

            {/* 知识库分类列表 */}
            <Stack spacing={2} sx={{ flex: 1, boxShadow: 'none', overflow: 'auto' }}>
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
                <Card sx={{ textAlign: 'center', py: 8, boxShadow: 'none' }}>
                  <Typography variant="body2" color="text.secondary">
                    暂无知识库，点击右上角按钮创建
                  </Typography>
                </Card>
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
                    <StatusBadge
                      text={folder.status === 1 ? '应用中' : '同步中'}
                      variant={folder.status === 1 ? 'applying' : 'default'}
                      sx={{
                        backgroundColor: folder.status === 1 ? undefined : '#fff3e0',
                        color: folder.status === 1 ? undefined : '#f57c00',
                      }}
                    />
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
                  alignItems: 'center',
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
        {currentSpace &&
          !currentFolder && [
            <MenuItem key="refresh" onClick={handleRefreshSpace}>
              <RefreshIcon fontSize="small" sx={{ mr: 1 }} />
              更新
            </MenuItem>,
            <MenuItem key="getSpaces" onClick={handleGetSpaces}>
              <GetAppIcon fontSize="small" sx={{ mr: 1 }} />
              获取知识库
            </MenuItem>,
            <MenuItem key="edit" onClick={handleEditSpace}>
              <EditIcon fontSize="small" sx={{ mr: 1 }} />
              编辑
            </MenuItem>,
            <MenuItem key="delete" onClick={handleDeleteSpace} sx={{ color: 'error.main' }}>
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
              删除
            </MenuItem>,
          ]}
        {currentFolder &&
          !currentSpace && [
            <MenuItem key="refreshFolder" onClick={handleRefreshFolder}>
              <RefreshIcon fontSize="small" sx={{ mr: 1 }} />
              更新
            </MenuItem>,
            <MenuItem key="deleteFolder" onClick={handleDeleteFolder} sx={{ color: 'error.main' }}>
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
              删除
            </MenuItem>,
          ]}
      </Menu>

      {/* 创建知识库菜单 */}
      <Menu
        anchorEl={createMenuAnchorEl}
        open={Boolean(createMenuAnchorEl)}
        onClose={handleCreateMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleCreatePandaWiki}>PandaWiki</MenuItem>
        <MenuItem onClick={handleCreateDingTalk}>钉钉</MenuItem>
        <MenuItem onClick={handleCreateFeishu} disabled>
          飞书
        </MenuItem>
      </Menu>

      {/* 创建/编辑连接模态框 */}
      <Modal
        open={showCreateModal}
        onCancel={handleModalCancel}
        title={
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box>{editSpace ? '编辑知识库' : `${getPlatformLabel(selectedPlatform)}文档`}</Box>
            {selectedPlatform !== PlatformPlatformType.PlatformPandawiki && (
              <Link
                href="https://koalaqa.docs.baizhi.cloud/node/019951c2-e49b-7ea5-9f75-74f3851d53dd"
                target="_blank"
                sx={{ color: '#3248F2', fontSize: 14 }}
              >
                使用文档
              </Link>
            )}
          </Stack>
        }
        onOk={
          selectedPlatform === PlatformPlatformType.PlatformDingtalk &&
          dingtalkStep === 1 &&
          !editSpace
            ? handleDingtalkNextStep
            : handleSubmit(handleModalOk)
        }
        okText={
          selectedPlatform === PlatformPlatformType.PlatformDingtalk &&
          dingtalkStep === 1 &&
          !editSpace
            ? '下一步'
            : '确定'
        }
        width={dingtalkStep === 2 ? 1000 : undefined}
        footer={
          selectedPlatform === PlatformPlatformType.PlatformDingtalk && dingtalkStep === 2 ? (
            <Stack direction="row" spacing={2} sx={{ px: 3, py: 2 }} justifyContent="flex-end">
              <Button variant="outlined" onClick={handleDingtalkPrevStep}>
                上一步
              </Button>
              <Button variant="contained" onClick={dingtalkGetSpaces}>
                获取知识库
              </Button>
            </Stack>
          ) : undefined
        }
      >
        {selectedPlatform === PlatformPlatformType.PlatformDingtalk ? (
          // 钉钉文档配置
          <Stack spacing={3}>
            {dingtalkStep === 1 ? (
              // 第一步：基础配置
              <>
                <TextField
                  {...register('title')}
                  label="名称"
                  fullWidth
                  placeholder="请输入知识库名称"
                  error={Boolean(formState.errors.title?.message)}
                  helperText={formState.errors.title?.message}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  {...register('app_id')}
                  label="Client ID"
                  fullWidth
                  placeholder="请输入 Client ID"
                  error={Boolean(formState.errors.app_id?.message)}
                  helperText={formState.errors.app_id?.message}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  {...register('secret')}
                  label="Client Secret"
                  fullWidth
                  placeholder="请输入 Client Secret"
                  error={Boolean(formState.errors.secret?.message)}
                  helperText={formState.errors.secret?.message}
                  InputLabelProps={{ shrink: true }}
                />
                <Box>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    标识符类型
                  </Typography>
                  <RadioGroup
                    value={identifierType}
                    onChange={e =>
                      setValue('identifier_type', e.target.value as 'unionid' | 'phone')
                    }
                    row
                  >
                    <FormControlLabel value="unionid" control={<Radio />} label="unionid" />
                    <FormControlLabel value="phone" control={<Radio />} label="手机号" />
                  </RadioGroup>
                </Box>
                {identifierType === 'unionid' ? (
                  <TextField
                    {...register('access_token')}
                    label="unionid"
                    fullWidth
                    placeholder="请输入unionid"
                    error={Boolean(formState.errors.access_token?.message)}
                    helperText={formState.errors.access_token?.message}
                    InputLabelProps={{ shrink: true }}
                  />
                ) : (
                  <TextField
                    {...register('phone')}
                    label="手机号"
                    fullWidth
                    placeholder="请输入手机号"
                    error={Boolean(formState.errors.phone?.message)}
                    helperText={formState.errors.phone?.message}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              </>
            ) : (
              // 第二步：配置指导
              <Stack spacing={3}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    配置订阅事件
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
                  {/* 步骤1 */}
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: '#1976d2',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                        mt: 0.5,
                      }}
                    >
                      1
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ minHeight: 60, pt: '2px' }}>
                        导航前往应用详情-开发配置-事件订阅，选择 Stream 模式推送，点击按钮进行验证。
                      </Typography>
                      <img
                        src={dingtalk_screen_1}
                        alt="钉钉配置步骤1"
                        style={{
                          width: '100%',
                          height: 250,
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                        onClick={() => handleImagePreview(dingtalk_screen_1, '钉钉配置步骤1')}
                      />
                    </Box>
                  </Box>

                  {/* 步骤2 */}
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: '#1976d2',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                        mt: 0.5,
                      }}
                    >
                      2
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ minHeight: 60, pt: '2px' }}>
                        验证通过后，下方事件订阅启用钉钉文档导出完成事件。
                      </Typography>
                      <img
                        src={dingtalk_screen_2}
                        alt="钉钉配置步骤2"
                        style={{
                          width: '100%',
                          height: 250,
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                        onClick={() => handleImagePreview(dingtalk_screen_2, '钉钉配置步骤2')}
                      />
                    </Box>
                  </Box>
                </Box>
              </Stack>
            )}
          </Stack>
        ) : (
          // 其他平台配置
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
              label={`${getPlatformLabel(selectedPlatform)} 后台地址`}
              fullWidth
              placeholder={
                selectedPlatform === 9
                  ? 'https://your-pandawiki.com'
                  : selectedPlatform === PlatformPlatformType.PlatformDingtalk
                  ? 'https://your-dingtalk.com'
                  : 'https://your-feishu.com'
              }
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
        )}
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

      {/* 图片预览弹窗 */}
      <Dialog
        open={imagePreviewOpen}
        onClose={handleImagePreviewClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            maxWidth: '90vw',
            maxHeight: '90vh',
            backgroundColor: 'transparent',
            boxShadow: 'none',
          },
        }}
      >
        <DialogTitle sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={handleImagePreviewClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
              },
              zIndex: 1,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{ p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <img
            src={previewImageSrc}
            alt={previewImageAlt}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: 8,
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KnowledgeBasePage;
