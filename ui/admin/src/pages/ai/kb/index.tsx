import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import z from 'zod';
import { useLocation, useNavigate, useSearchParams, Outlet } from 'react-router-dom';
import { useRequest } from 'ahooks';
import { message, Modal } from '@ctzhian/ui';
import { Dialog, DialogContent, DialogTitle, Grid, IconButton, Menu, MenuItem } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  deleteAdminKbKbIdSpaceSpaceId,
  deleteAdminKbKbIdSpaceSpaceIdFolderFolderId,
  getAdminKbKbIdSpaceSpaceId,
  ModelDocType,
  PlatformPlatformType,
  postAdminKbKbIdSpace,
  postAdminKbSpaceRemote,
  putAdminKbKbIdSpaceSpaceId,
  putAdminKbKbIdSpaceSpaceIdFolderFolderId,
  putAdminKbKbIdSpaceSpaceIdRefresh,
  SvcCreateSpaceReq,
  SvcListRemoteReq,
  SvcListSpaceFolderItem,
  SvcListSpaceItem,
  SvcUpdateSpaceReq,
  TopicKBSpaceUpdateType,
} from '@/api';
import { useCategoryEdit } from '@/hooks/useCategoryEdit';
import CategoryItemSelector from '@/components/CategoryItemSelector';
import { useKBSpaces } from './hooks/useKBSpaces';
import { useKBFolders } from './hooks/useKBFolders';
import { useRemoteSpaces } from './hooks/useRemoteSpaces';
import { useFolderDocs } from './hooks/useFolderDocs';
import { useFeishuAuth } from './hooks/useFeishuAuth';
import { SpaceList } from './components/SpaceList';
import { FolderList } from './components/FolderList';
import { ImportModal } from './components/ImportModal';
import { CreateSpaceModal } from './components/CreateSpaceModal';
import { DocStatusModal } from './components/DocStatusModal';

const spaceSchema = z.object({
  title: z.string().min(1, '标题必填').default(''),
  url: z.string().optional(),
  access_token: z.string().optional(),
  app_id: z.string().optional(),
  secret: z.string().optional(),
  phone: z.string().optional(),
  identifier_type: z.enum(['unionid', 'phone']).default('unionid'),
  user_third_id: z.string().optional(),
  username: z.string().optional(),
});

const KnowledgeBasePage = () => {
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createMenuAnchorEl, setCreateMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [currentSpace, setCurrentSpace] = useState<SvcListSpaceItem | null>(null);
  const [currentFolder, setCurrentFolder] = useState<SvcListSpaceFolderItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDocStatusModal, setShowDocStatusModal] = useState(false);
  const [docStatusFolder, setDocStatusFolder] = useState<SvcListSpaceFolderItem | null>(null);
  const [editSpace, setEditSpace] = useState<SvcListSpaceItem | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<number>(
    PlatformPlatformType.PlatformPandawiki
  );
  const [dingtalkStep, setDingtalkStep] = useState<number>(0);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState('');
  const [previewImageAlt, setPreviewImageAlt] = useState('');

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const kb_id = +searchParams.get('id')!;
  const urlSpaceId = searchParams.get('spaceId');

  // 使用自定义hooks
  const { spaces, refreshSpaces } = useKBSpaces(kb_id, selectedSpaceId, setSelectedSpaceId, urlSpaceId);
  const { folders, refreshFolders, foldersLoading } = useKBFolders(kb_id, selectedSpaceId);
  const { treeData, setTreeData, fetchRemoteSpaces } = useRemoteSpaces(kb_id);
  const {
    folderDocs,
    folderDocListData,
    fetchFolderDocList,
    mutateFolderDocs,
    startPolling,
    stopPolling,
    pollingFolderRef,
    pollingSpaceIdRef,
    lastFolderDocDataRef,
  } = useFolderDocs(kb_id, selectedSpaceId);
  const feishuAuth = useFeishuAuth(kb_id, editSpace?.id);

  // 使用分类编辑hook
  const categoryEdit = useCategoryEdit({
    kbId: kb_id,
    docType: ModelDocType.DocTypeDocument,
    onSuccess: (updatedIds, newGroupIds) => {
      // 直接更新本地数据，不重新请求
      if (folderDocListData?.items) {
        const newItems = folderDocListData.items.map(item => {
          if (updatedIds.includes(item.id!)) {
            return { ...item, group_ids: newGroupIds };
          }
          return item;
        });
        mutateFolderDocs({ ...folderDocListData, items: newItems });
      }
    },
  });

  // 表单
  const { register, formState, handleSubmit, reset, watch, setValue } = useForm({
    resolver: zodResolver(spaceSchema),
  });

  const appId = watch('app_id');
  const secret = watch('secret');
  const userThirdId = watch('user_third_id');

  // 监听飞书绑定状态变化
  useEffect(() => {
    if (selectedPlatform === PlatformPlatformType.PlatformFeishu) {
      feishuAuth.checkRebindStatus(appId || '', secret || '', userThirdId || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, secret, selectedPlatform]);

  // 获取知识库详情（用于编辑时获取完整信息）
  const { run: fetchSpaceDetail } = useRequest(
    (spaceId: number) => getAdminKbKbIdSpaceSpaceId({ kbId: kb_id, spaceId: spaceId }),
    {
      manual: true,
      onSuccess: data => {
        if (data && editSpace) {
          const spaceDetail = data;
          const platformOpt = spaceDetail.platform_opt as any;
          setSelectedPlatform(spaceDetail.platform || 0);
          feishuAuth.originalAppIdRef.current = platformOpt?.app_id || '';
          feishuAuth.originalSecretRef.current = platformOpt?.secret || '';
          reset({
            title: spaceDetail.title || '',
            url: platformOpt?.url || '',
            access_token: platformOpt?.unionid || platformOpt?.access_token || '',
            app_id: platformOpt?.app_id || '',
            secret: platformOpt?.secret || '',
            phone: platformOpt?.phone || '',
            identifier_type: platformOpt?.identifier_type || 'unionid',
            user_third_id: platformOpt?.user_third_id || '',
            username: platformOpt?.username || '',
          });
        }
      },
    }
  );

  // 处理URL参数中的error=nil，打开飞书知识库弹窗并填充表单
  useEffect(() => {
    const handleErrorParam = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');

      if (errorParam === 'nil') {
        try {
          setSelectedPlatform(PlatformPlatformType.PlatformFeishu);
          setShowCreateModal(true);
          setEditSpace(null);
          feishuAuth.setFeishuBoundUser(null);

          const response = await feishuAuth.checkFeishuBoundUser();
          if (response) {
            reset({
              title: response?.name || '',
              url: '',
              access_token: response.user_info?.access_token || '',
              app_id: response.client_id || '',
              secret: response.client_secret || '',
              phone: '',
              identifier_type: 'unionid',
              user_third_id: response.user_info?.id || '',
              username: response.user_info?.name || '',
            });
          }

          urlParams.delete('error');
          const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;
          window.history.replaceState({}, '', newUrl);
        } catch (error) {
          console.error('处理error参数失败:', error);
        }
      } else if (errorParam) {
        message.error(errorParam, 6000);
      }
    };

    handleErrorParam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 菜单处理
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

  const handleCreateMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setCreateMenuAnchorEl(event.currentTarget);
  };

  const handleCreateMenuClose = () => {
    setCreateMenuAnchorEl(null);
  };

  // 创建知识库
  const handleCreateSpace = (platform: PlatformPlatformType) => {
    setSelectedPlatform(platform);
    setShowCreateModal(true);
    setEditSpace(null);
    feishuAuth.setFeishuBoundUser(null);
    reset(spaceSchema.parse({}));
    handleCreateMenuClose();
  };

  const handleCreatePandaWiki = () => {
    handleCreateSpace(PlatformPlatformType.PlatformPandawiki);
  };

  const handleCreateDingTalk = () => {
    setDingtalkStep(1);
    handleCreateSpace(PlatformPlatformType.PlatformDingtalk);
  };

  const handleCreateFeishu = () => {
    handleCreateSpace(PlatformPlatformType.PlatformFeishu);
  };

  // 编辑和删除知识库
  const handleEditSpace = () => {
    if (currentSpace) {
      setEditSpace(currentSpace);
      setDingtalkStep(1);
      if (currentSpace.platform !== undefined) {
        setSelectedPlatform(currentSpace.platform);
      }
      setShowCreateModal(true);
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
            await deleteAdminKbKbIdSpaceSpaceId({ kbId: kb_id, spaceId: currentSpace.id || 0 });
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

  const handleRefreshSpace = async () => {
    if (currentSpace) {
      try {
        await putAdminKbKbIdSpaceSpaceIdRefresh({ kbId: kb_id, spaceId: currentSpace.id || 0 });
        message.success('更新成功');
        refreshFolders();
      } catch {
        message.error('更新失败');
      }
    }
    handleMenuClose();
  };

  // 文件夹操作
  const handleRefreshFolder = async () => {
    if (!currentFolder || !selectedSpaceId) return;
    handleMenuClose();

    try {
      await putAdminKbKbIdSpaceSpaceIdFolderFolderId(
        {
          kbId: kb_id,
          spaceId: selectedSpaceId,
          folderId: currentFolder.id!,
        },
        { update_type: TopicKBSpaceUpdateType.KBSpaceUpdateTypeIncr }
      );
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
          await deleteAdminKbKbIdSpaceSpaceIdFolderFolderId({
            kbId: kb_id,
            spaceId: selectedSpaceId,
            folderId: currentFolder.id!,
          });
          message.success('删除成功');
          refreshFolders();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  // 查看文档同步状态
  const handleViewFolderDocs = (folder: SvcListSpaceFolderItem) => {
    if (!folder || !selectedSpaceId) return;

    setDocStatusFolder(folder);
    pollingFolderRef.current = folder;
    pollingSpaceIdRef.current = selectedSpaceId;

    fetchFolderDocList(folder);
    startPolling();

    setShowDocStatusModal(true);
    handleMenuClose();
  };

  const closeDocStatusModal = () => {
    stopPolling();
    pollingFolderRef.current = null;
    pollingSpaceIdRef.current = null;
    lastFolderDocDataRef.current = null;
    setShowDocStatusModal(false);
    setDocStatusFolder(null);
  };

  const handleRetryFailedDocs = async (docIds: number[]) => {
    if (!docStatusFolder || !selectedSpaceId || docIds.length === 0) return;

    try {
      await putAdminKbKbIdSpaceSpaceIdFolderFolderId(
        {
          kbId: kb_id,
          spaceId: selectedSpaceId,
          folderId: docStatusFolder.id!,
        },
        { update_type: TopicKBSpaceUpdateType.KBSpaceUpdateTypeFailed }
      );
      message.success('重试同步已开始');
      fetchFolderDocList(docStatusFolder);
    } catch {
      message.error('重试同步失败');
    }
  };

  // 获取知识库
  const handleGetSpaces = async () => {
    if (currentSpace?.id) {
      setSelectedSpaceId(currentSpace.id || null);
      await fetchRemoteSpaces(currentSpace.id, currentSpace.platform);
      setShowImportModal(true);
      refreshSpaces();
    }
    handleMenuClose();
  };

  // 钉钉流程
  const handleDingtalkNextStep = async () => {
    try {
      const formData = await new Promise((resolve, reject) => {
        handleSubmit(
          data => resolve(data),
          errors => reject(errors)
        )();
      });

      const platformOpt = {
        access_token: (formData as any).access_token,
        app_id: (formData as any).app_id,
        secret: (formData as any).secret,
        phone: (formData as any).phone,
        url: (formData as any).url,
      };

      const requestData: SvcListRemoteReq = {
        platform: PlatformPlatformType.PlatformDingtalk,
        opt: platformOpt,
      };

      await postAdminKbSpaceRemote(requestData);
      setDingtalkStep(2);
    } catch (error) {
      console.error('钉钉配置验证失败:', error);
      message.error('配置验证失败，请检查填写的信息是否正确');
    }
  };

  const handleDingtalkPrevStep = () => {
    setDingtalkStep(1);
  };

  const dingtalkGetSpaces = async () => {
    try {
      const formData = await new Promise((resolve, reject) => {
        handleSubmit(
          data => resolve(data),
          errors => reject(errors)
        )();
      });

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

      const newSpaceId = await postAdminKbKbIdSpace({ kbId: kb_id }, spaceData);

      setCurrentSpace({ id: newSpaceId });
      setSelectedSpaceId(newSpaceId);
      fetchRemoteSpaces(newSpaceId, spaceData.platform);
      setShowCreateModal(false);
      setShowImportModal(true);
      refreshSpaces();

      message.success('知识库创建成功');
    } catch (error) {
      console.error('获取知识库失败:', error);
      message.error('获取知识库失败，请检查配置是否正确');
    }
  };

  // 模态框操作
  const handleModalCancel = () => {
    setShowCreateModal(false);
    setEditSpace(null);
    setDingtalkStep(0);
    setSelectedPlatform(PlatformPlatformType.PlatformPandawiki);
    feishuAuth.setFeishuBoundUser(null);
    feishuAuth.setNeedsRebind(false);
    feishuAuth.originalAppIdRef.current = '';
    feishuAuth.originalSecretRef.current = '';
    reset(spaceSchema.parse({}));
  };

  const handleModalOk = async (data: any) => {
    try {
      // 飞书平台需要验证是否已绑定账号
      if (selectedPlatform === PlatformPlatformType.PlatformFeishu) {
        if (feishuAuth.needsRebind) {
          message.warning('信息已变更，请先解除绑定后重新绑定账号');
          return;
        }
        if (!editSpace && !feishuAuth.feishuBoundUser?.user_info) {
          message.warning('请先绑定账号');
          return;
        }
        if (feishuAuth.feishuBoundUser?.user_info?.access_token) {
          data.access_token = feishuAuth.feishuBoundUser.user_info.access_token;
        }
        if (feishuAuth.feishuBoundUser?.user_info?.refresh_token) {
          data.refresh_token = feishuAuth.feishuBoundUser.user_info.refresh_token;
        }
      }

      const platformOpt = {
        url: data.url,
        access_token: data.access_token,
        ...([PlatformPlatformType.PlatformDingtalk, PlatformPlatformType.PlatformFeishu].includes(
          selectedPlatform
        ) && {
          app_id: data.app_id,
          secret: data.secret,
          unionid: data.unionid,
          phone: data.phone,
          identifier_type: data.identifier_type,
          refresh_token: data.refresh_token,
          user_third_id: data.user_third_id,
          username: data.username,
        }),
      };

      if (editSpace || feishuAuth.feishuBoundUser?.id) {
        const updateData: SvcUpdateSpaceReq = {
          title: data.title,
          opt: platformOpt,
        };
        await putAdminKbKbIdSpaceSpaceId(
          { kbId: kb_id, spaceId: editSpace?.id || feishuAuth.feishuBoundUser?.id || 0 },
          updateData
        );
        message.success('修改成功');
      } else {
        const spaceData: SvcCreateSpaceReq = {
          title: data.title,
          platform: selectedPlatform,
          opt: platformOpt,
        };
        const newSpaceId = await postAdminKbKbIdSpace({ kbId: kb_id }, spaceData);
        if (selectedPlatform === PlatformPlatformType.PlatformDingtalk) {
          return newSpaceId;
        }
        message.success('创建成功');
        setShowImportModal(true);
        setSelectedSpaceId(newSpaceId);
        fetchRemoteSpaces(newSpaceId, selectedPlatform);
      }
      handleModalCancel();
      refreshSpaces();
    } catch {
      message.error('操作失败');
    }
  };

  // 点击知识库
  const handleSpaceClick = (space: SvcListSpaceItem) => {
    setSelectedSpaceId(space.id || null);
    if (location.pathname.includes('/kb/detail')) {
      navigate(`/admin/ai/kb?id=${kb_id}`);
    }
  };

  // 点击文件夹
  const handleFolderClick = (folderId: number, folderTitle: string) => {
    const currentSearch = searchParams.toString();
    const newSearch = new URLSearchParams(currentSearch);
    newSearch.set('spaceId', String(selectedSpaceId));
    newSearch.set('folderId', String(folderId));
    newSearch.set('folderTitle', folderTitle);
    if (!newSearch.get('id')) {
      newSearch.set('id', String(kb_id));
    }
    navigate(`detail?${newSearch.toString()}`);
  };

  // 图片预览
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

  // 飞书账号绑定
  const handleBindFeishuAccount = async () => {
    await feishuAuth.handleBindFeishuAccount(
      watch('app_id') || '',
      watch('secret') || '',
      watch('title') || ''
    );
  };

  const handleUnbindFeishuAccount = () => {
    feishuAuth.handleUnbindFeishuAccount(setValue);
  };

  // 分类编辑
  const handleConfirmEditCategory = async () => {
    await categoryEdit.handleConfirmEditCategory();
  };

  return (
    <>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* 左侧知识库列表 */}
        <Grid size={{ xs: 12 }} sx={{ height: '100%', width: '373px', flexShrink: 0 }}>
          <SpaceList
            spaces={spaces}
            selectedSpaceId={selectedSpaceId}
            onSpaceClick={handleSpaceClick}
            onMenuClick={handleMenuClick}
            onCreateClick={handleCreateMenuClick}
          />
        </Grid>

        {/* 右侧内容区域 */}
        <Grid size={{ xs: 12 }} sx={{ height: '100%', flex: 1, minWidth: 0 }}>
          {location.pathname.includes('/kb/detail') ? (
            <Outlet />
          ) : (
            <FolderList
              folders={folders}
              selectedSpaceId={selectedSpaceId}
              foldersLoading={foldersLoading}
              onFolderClick={handleFolderClick}
              onFolderMenuClick={handleFolderMenuClick}
            />
          )}
        </Grid>
      </Grid>

      {/* 操作菜单 */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {currentSpace &&
          !currentFolder && [
            <MenuItem key="refresh" onClick={handleRefreshSpace}>
              更新
            </MenuItem>,
            <MenuItem key="getSpaces" onClick={handleGetSpaces}>
              获取知识库
            </MenuItem>,
            <MenuItem key="edit" onClick={handleEditSpace}>
              编辑
            </MenuItem>,
            <MenuItem key="delete" onClick={handleDeleteSpace} sx={{ color: 'error.main' }}>
              删除
            </MenuItem>,
          ]}
        {currentFolder &&
          !currentSpace && [
            <MenuItem
              key="viewDocs"
              onClick={() => {
                if (currentFolder) {
                  handleViewFolderDocs(currentFolder);
                }
              }}
            >
              查看文档
            </MenuItem>,
            <MenuItem key="refreshFolder" onClick={handleRefreshFolder}>
              更新
            </MenuItem>,
            <MenuItem key="deleteFolder" onClick={handleDeleteFolder} sx={{ color: 'error.main' }}>
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
        <MenuItem onClick={handleCreateFeishu}>飞书</MenuItem>
      </Menu>

      {/* 创建/编辑知识库模态框 */}
      <CreateSpaceModal
        open={showCreateModal}
        onClose={handleModalCancel}
        onOk={handleModalOk}
        form={{ register, formState, handleSubmit, reset, watch, setValue } as any}
        editSpace={editSpace}
        selectedPlatform={selectedPlatform}
        dingtalkStep={dingtalkStep}
        onDingtalkNextStep={handleDingtalkNextStep}
        onDingtalkPrevStep={handleDingtalkPrevStep}
        onDingtalkGetSpaces={dingtalkGetSpaces}
        feishuBoundUser={feishuAuth.feishuBoundUser}
        needsRebind={feishuAuth.needsRebind}
        onBindFeishuAccount={handleBindFeishuAccount}
        onUnbindFeishuAccount={handleUnbindFeishuAccount}
        onImagePreview={handleImagePreview}
      />

      {/* 获取知识库模态框 */}
      <ImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        kbId={kb_id}
        selectedSpaceId={selectedSpaceId}
        treeData={treeData}
        setTreeData={setTreeData}
        onSuccess={refreshFolders}
      />

      {/* 查看文档同步状态模态框 */}
      <DocStatusModal
        open={showDocStatusModal}
        onClose={closeDocStatusModal}
        folder={docStatusFolder}
        folderDocs={folderDocs}
        kbId={kb_id}
        onRetryFailedDocs={handleRetryFailedDocs}
        onEditCategory={categoryEdit.handleEditCategory}
      />

      {/* 编辑分类弹窗 */}
      <Modal
        open={!!categoryEdit.editingCategoryItem}
        onCancel={categoryEdit.handleCloseEditModal}
        title="编辑分类"
        onOk={handleConfirmEditCategory}
      >
        <CategoryItemSelector
          selectedItemIds={categoryEdit.editCategorySelection.selectedItemIds}
          onChange={(itemIds, groupIds) => {
            categoryEdit.editCategorySelection.setSelectedItemIds(itemIds);
            categoryEdit.editCategorySelection.setSelectedGroupIds(groupIds);
          }}
        />
      </Modal>

      {/* 图片预览弹窗 */}
      <Dialog
        open={imagePreviewOpen}
        onClose={handleImagePreviewClose}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              maxWidth: '90vw',
              maxHeight: '90vh',
              backgroundColor: 'transparent',
              boxShadow: 'none',
            },
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

