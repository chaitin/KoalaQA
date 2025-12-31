import {
  deleteAdminKbKbIdSpaceSpaceId,
  deleteAdminKbKbIdSpaceSpaceIdFolderFolderId,
  getAdminKbKbIdDocumentDocId,
  getAdminKbKbIdSpace,
  getAdminKbKbIdSpaceSpaceId,
  getAdminKbKbIdSpaceSpaceIdFolder,
  getAdminKbKbIdSpaceSpaceIdFolderFolderIdDoc,
  getAdminKbKbIdSpaceSpaceIdRemote,
  ModelDocStatus,
  ModelDocType,
  PlatformPlatformType,
  postAdminKbKbIdSpace,
  postAdminKbKbIdSpaceSpaceIdFolder,
  postAdminKbSpaceRemote,
  putAdminKbKbIdSpaceSpaceId,
  putAdminKbKbIdSpaceSpaceIdFolderFolderId,
  putAdminKbKbIdSpaceSpaceIdRefresh,
  SvcCreateSpaceForlderItem,
  SvcCreateSpaceReq,
  SvcDocListItem,
  SvcListRemoteReq,
  SvcListSpaceFolderItem,
  SvcListSpaceItem,
  SvcListSpaceKBItem,
  SvcUpdateSpaceReq,
  TopicKBSpaceUpdateType,
} from '@/api';
import { getAdminKbDocumentFeishuUser, postAdminKbDocumentFeishuAuthUrl } from '@/api/Document';
import { AdminDocUserRes } from '@/api/types';
import dingtalk_screen_1 from '@/assets/images/dingtalk_1.png';
import dingtalk_screen_2 from '@/assets/images/dingtalk_2.png';
import CategoryDisplay from '@/components/CategoryDisplay';
import CategoryItemSelector from '@/components/CategoryItemSelector';
import LoadingButton from '@/components/LoadingButton';
import StatusBadge from '@/components/StatusBadge';
import { useCategoryEdit } from '@/hooks/useCategoryEdit';
import { Card, Icon, message, Modal, Table } from '@ctzhian/ui';
import { ColumnsType } from '@ctzhian/ui/dist/Table';
import { zodResolver } from '@hookform/resolvers/zod';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderIcon from '@mui/icons-material/Folder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import z from 'zod';

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
  const [docStatusSearch, setDocStatusSearch] = useState('');
  const [docStatusTab, setDocStatusTab] = useState<'all' | 'success' | 'failed'>('all');
  const [docFailReasonById, setDocFailReasonById] = useState<Record<number, string>>({});
  const [docFailReasonLoadingById, setDocFailReasonLoadingById] = useState<Record<number, boolean>>(
    {}
  );
  const [editSpace, setEditSpace] = useState<SvcListSpaceItem | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingFolderRef = useRef<SvcListSpaceFolderItem | null>(null);
  const pollingSpaceIdRef = useRef<number | null>(null);
  const lastFolderDocDataRef = useRef<any>(null);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set()); // 选中的具体文档 doc_id
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [docDetails, setDocDetails] = useState<Record<string, SvcListSpaceKBItem[]>>({});
  const [selectedPlatform, setSelectedPlatform] = useState<number>(
    PlatformPlatformType.PlatformPandawiki
  );

  const [dingtalkStep, setDingtalkStep] = useState<number>(0);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState('');
  const [previewImageAlt, setPreviewImageAlt] = useState('');
  const [feishuBoundUser, setFeishuBoundUser] = useState<AdminDocUserRes | null>(null);
  const [needsRebind, setNeedsRebind] = useState(false); // 标记是否需要重新绑定
  const originalAppIdRef = useRef<string>(''); // 保存原始的 app_id
  const originalSecretRef = useRef<string>(''); // 保存原始的 secret
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const kb_id = +searchParams.get('id')!;
  
  // 从 URL 参数中恢复选中的 spaceId（用于刷新页面时保持选中状态）
  const urlSpaceId = searchParams.get('spaceId');
  
  // 使用分类编辑hook
  const categoryEdit = useCategoryEdit({
    kbId: kb_id,
    docType: ModelDocType.DocTypeDocument,
    onSuccess: () => {
      if (docStatusFolder) {
        fetchFolderDocList(docStatusFolder);
      }
    },
  });

  // 获取知识库空间列表
  const { data: spacesData, refresh: refreshSpaces } = useRequest(
    () => getAdminKbKbIdSpace({ kbId: kb_id }),
    {
      onSuccess: data => {
        // 如果 URL 中有 spaceId，优先使用 URL 中的值
        if (urlSpaceId) {
          const spaceIdFromUrl = Number(urlSpaceId);
          if (!Number.isNaN(spaceIdFromUrl) && spaceIdFromUrl > 0) {
            // 验证 spaceId 是否存在于列表中
            const spaceExists = data?.items?.some(space => space.id === spaceIdFromUrl);
            if (spaceExists && selectedSpaceId !== spaceIdFromUrl) {
              setSelectedSpaceId(spaceIdFromUrl);
              return;
            }
          }
        }
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
  
  // 当 URL 中的 spaceId 变化时，更新选中状态
  useEffect(() => {
    if (urlSpaceId) {
      const spaceIdFromUrl = Number(urlSpaceId);
      if (!Number.isNaN(spaceIdFromUrl) && spaceIdFromUrl > 0 && selectedSpaceId !== spaceIdFromUrl) {
        // 验证 spaceId 是否存在于列表中
        const spaceExists = spacesData?.items?.some(space => space.id === spaceIdFromUrl);
        if (spaceExists) {
          setSelectedSpaceId(spaceIdFromUrl);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSpaceId, spacesData]);

  // 获取选中空间的文件夹列表
  const {
    data: foldersData,
    refresh: refreshFolders,
    loading: foldersLoading,
  } = useRequest(
    () =>
      selectedSpaceId
        ? getAdminKbKbIdSpaceSpaceIdFolder({ kbId: kb_id, spaceId: selectedSpaceId })
        : Promise.resolve(null),
    {
      refreshDeps: [selectedSpaceId],
    }
  );

  // 获取远程知识库列表
  const { data: remoteData, run: fetchRemoteSpaces } = useRequest(
    (id: number, platform?: number) => {
      const promise = getAdminKbKbIdSpaceSpaceIdRemote({ kbId: kb_id, spaceId: id });

      // 如果是飞书平台，在返回数据中添加云盘数据
      if (platform === PlatformPlatformType.PlatformFeishu) {
        return promise.then(response => {
          if (response?.items) {
            // 检查是否已经存在云盘数据，避免重复添加
            const hasCloudDisk = response.items.some(item => item.doc_id === 'cloud_disk');
            if (!hasCloudDisk) {
              response.items.unshift({
                doc_id: 'cloud_disk',
                title: '云盘',
              });
            }
          }
          return response;
        });
      }

      return promise;
    },
    {
      manual: true,
    }
  );

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
          console.log(spaceDetail);
          // 保存原始的 app_id 和 secret
          originalAppIdRef.current = platformOpt?.app_id || '';
          originalSecretRef.current = platformOpt?.secret || '';
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
      // 直接从URL获取error参数
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');

      // 如果error=nil，打开飞书创建弹窗并填充表单
      if (errorParam === 'nil') {
        try {
          // 打开飞书创建弹窗
          setSelectedPlatform(PlatformPlatformType.PlatformFeishu);
          setShowCreateModal(true);
          setEditSpace(null);
          setFeishuBoundUser(null);

          // 调用checkFeishuBoundUser获取用户信息
          const response = await getAdminKbDocumentFeishuUser();
          if (response) {
            setFeishuBoundUser(response);

            // 保存原始的 app_id 和 secret
            originalAppIdRef.current = response.client_id || '';
            originalSecretRef.current = response.client_secret || '';

            // 将返回值填充到表单
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

          // 清除URL中的error参数
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

  // 绑定飞书账号
  const handleBindFeishuAccount = async () => {
    const appId = watch('app_id');
    const secret = watch('secret');
    const name = watch('title');

    if (!appId || !secret) {
      message.warning('请先填写 Client ID 和 Client Secret');
      return;
    }

    // 在绑定前保存原始的 app_id 和 secret
    originalAppIdRef.current = appId;
    originalSecretRef.current = secret;
    setNeedsRebind(false); // 重置重新绑定标记

    try {
      const response = await postAdminKbDocumentFeishuAuthUrl({
        name: name || '',
        client_id: appId,
        client_secret: secret,
        id: editSpace?.id,
        kb_id,
      });

      if (response) {
        // 跳转到授权页面
        window.location.href = response;
      }
    } catch (error) {
      console.error('获取授权URL失败:', error);
      message.error('获取授权URL失败，请检查配置是否正确');
    }
  };

  // 解除绑定飞书账号
  const handleUnbindFeishuAccount = () => {
    if (editSpace?.id) {
      setFeishuBoundUser(null);
      setValue('user_third_id', '');
      setValue('username', '');
    } else {
      setFeishuBoundUser(null);
      message.success('已解除绑定，保存时需要重新绑定账号');
    }
    // 清除原始值和重新绑定标记
    originalAppIdRef.current = '';
    originalSecretRef.current = '';
    setNeedsRebind(false);
  };

  const spaces = spacesData?.items || [];
  const folders = foldersData?.items || [];

  // 组件卸载时清理轮询定时器
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const getDocSyncState = (status?: ModelDocStatus) => {
    if (status === ModelDocStatus.DocStatusApplySuccess) {
      return 'success' as const;
    }
    if (
      status === ModelDocStatus.DocStatusApplyFailed ||
      status === ModelDocStatus.DocStatusExportFailed
    ) {
      return 'failed' as const;
    }
    return 'syncing' as const;
  };

  const { data: folderDocListData, run: fetchFolderDocList } = useRequest(
    (folder?: SvcListSpaceFolderItem | null) => {
      console.log('API调用开始，folder:', folder, 'selectedSpaceId:', selectedSpaceId);
      if (!selectedSpaceId) {
        console.log('selectedSpaceId为空，跳过API调用');
        return Promise.resolve(null);
      }
      if (!folder?.id) {
        console.log('folder.id为空，跳过API调用');
        return Promise.resolve(null);
      }
      return getAdminKbKbIdSpaceSpaceIdFolderFolderIdDoc({
        kbId: kb_id,
        spaceId: selectedSpaceId,
        folderId: String(folder.id),
        page: 1,
        size: 9999999,
      });
    },
    {
      manual: true,
      onSuccess: (response: any) => {
        // 比较新旧数据，只有数据真正变化时才更新
        if (
          lastFolderDocDataRef.current &&
          response &&
          JSON.stringify(lastFolderDocDataRef.current) === JSON.stringify(response)
        ) {
          console.log('数据未变化，跳过状态更新');
          return;
        }
        console.log('数据发生变化，更新状态');
        lastFolderDocDataRef.current = response;
      },
    }
  );

  const folderDocs: SvcDocListItem[] = folderDocListData?.items || [];

  // 启动轮询
  const startPolling = () => {
    console.log('启动轮询');
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = setInterval(() => {
      console.log(
        '轮询执行中，pollingFolderRef:',
        pollingFolderRef.current,
        'pollingSpaceIdRef:',
        pollingSpaceIdRef.current
      );
      if (pollingFolderRef.current && pollingSpaceIdRef.current) {
        console.log('执行轮询获取数据');
        fetchFolderDocList(pollingFolderRef.current);
      } else {
        console.log('轮询条件不满足，跳过');
      }
    }, 5000); // 每5秒轮询一次
  };

  // 停止轮询
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };


  const closeDocStatusModal = () => {
    stopPolling();
    pollingFolderRef.current = null;
    pollingSpaceIdRef.current = null;
    lastFolderDocDataRef.current = null;
    setShowDocStatusModal(false);
    setDocStatusFolder(null);
    setDocStatusSearch('');
    setDocStatusTab('all');
  };

  const ensureDocFailReason = async (docId?: number) => {
    if (!docId) return;
    if (docFailReasonById[docId]) return;
    if (docFailReasonLoadingById[docId]) return;
    setDocFailReasonLoadingById(prev => ({ ...prev, [docId]: true }));
    try {
      const detail = await getAdminKbKbIdDocumentDocId({ kbId: kb_id, docId });
      const reason = (detail?.message || detail?.desc || '').trim();
      setDocFailReasonById(prev => ({
        ...prev,
        [docId]: reason || '暂无失败原因',
      }));
    } catch {
      setDocFailReasonById(prev => ({
        ...prev,
        [docId]: '获取失败原因失败',
      }));
    } finally {
      setDocFailReasonLoadingById(prev => ({ ...prev, [docId]: false }));
    }
  };

  const { register, formState, handleSubmit, reset, watch, setValue } = useForm({
    resolver: zodResolver(spaceSchema),
  });

  const identifierType = watch('identifier_type');
  const appId = watch('app_id');
  const secret = watch('secret');

  // 监听 client_id 和 client_secret 的变化
  useEffect(() => {
    if (selectedPlatform === PlatformPlatformType.PlatformFeishu && watch('user_third_id')) {
      // 如果已绑定账号，检查 app_id 或 secret 是否与原始值不同
      const hasChanged = Boolean(
        (originalAppIdRef.current && appId !== originalAppIdRef.current) ||
        (originalSecretRef.current && secret !== originalSecretRef.current)
      );
      setNeedsRebind(hasChanged);
    } else {
      setNeedsRebind(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, secret, selectedPlatform]);

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

  const handleCreateSpace = (platform: PlatformPlatformType) => {
    setSelectedPlatform(platform);
    setShowCreateModal(true);
    setEditSpace(null);
    setFeishuBoundUser(null); // 重置绑定状态
    reset(spaceSchema.parse({}));
    handleCreateMenuClose();
  };

  const handleCreatePandaWiki = () => {
    handleCreateSpace(PlatformPlatformType.PlatformPandawiki); // PandaWiki platform type
  };

  const handleCreateDingTalk = () => {
    setDingtalkStep(1);
    handleCreateSpace(PlatformPlatformType.PlatformDingtalk); // 钉钉 platform type
  };

  const handleCreateFeishu = () => {
    handleCreateSpace(PlatformPlatformType.PlatformFeishu); // 飞书 platform type
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
      // 先设置平台类型，避免异步加载时的时序问题
      if (currentSpace.platform !== undefined) {
        setSelectedPlatform(currentSpace.platform);
      }
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

  const handleRetryFailedDocs = async (docIds: number[]) => {
    if (!docStatusFolder || !selectedSpaceId || docIds.length === 0) return;

    try {
      // 逐个重试失败的文档
      await putAdminKbKbIdSpaceSpaceIdFolderFolderId(
        {
          kbId: kb_id,
          spaceId: selectedSpaceId,
          folderId: docStatusFolder.id!,
        },
        { update_type: TopicKBSpaceUpdateType.KBSpaceUpdateTypeFailed }
      );
      message.success('重试同步已开始');
      // 重新获取文档列表
      fetchFolderDocList(docStatusFolder);
    } catch {
      message.error('重试同步失败');
    }
  };

  // 确认编辑单个项目的分类
  const handleConfirmEditCategory = async () => {
    await categoryEdit.handleConfirmEditCategory();
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

  const handleRefreshSpace = () => {
    if (currentSpace) {
      putAdminKbKbIdSpaceSpaceIdRefresh({ kbId: kb_id, spaceId: currentSpace.id || 0 })
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

      const newSpaceId = await postAdminKbKbIdSpace({ kbId: kb_id }, spaceData);

      // 成功后执行 dingtalkGetSpaces 逻辑
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
  const handleGetSpaces = async () => {
    if (currentSpace?.id) {
      setSelectedSpaceId(currentSpace.id || null);
      await fetchRemoteSpaces(currentSpace.id, currentSpace.platform);
      setShowImportModal(true);
      refreshSpaces();
    }
    handleMenuClose();
  };

  const handleModalCancel = () => {
    setShowCreateModal(false);
    setEditSpace(null);
    setDingtalkStep(0);
    setSelectedPlatform(PlatformPlatformType.PlatformPandawiki); // 重置为默认平台
    setFeishuBoundUser(null); // 清除绑定状态
    setNeedsRebind(false); // 清除重新绑定标记
    originalAppIdRef.current = ''; // 清除原始值
    originalSecretRef.current = ''; // 清除原始值
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
      // 飞书平台需要验证是否已绑定账号
      if (selectedPlatform === PlatformPlatformType.PlatformFeishu) {
        // 检查是否需要重新绑定
        if (needsRebind) {
          message.warning('信息已变更，请先解除绑定后重新绑定账号');
          return;
        }
        if (!editSpace && !feishuBoundUser?.user_info) {
          message.warning('请先绑定账号');
          return;
        }
        // 将绑定的access_token和refresh_token添加到配置中
        if (feishuBoundUser?.user_info?.access_token) {
          data.access_token = feishuBoundUser.user_info.access_token;
        }
        if (feishuBoundUser?.user_info?.refresh_token) {
          data.refresh_token = feishuBoundUser.user_info.refresh_token;
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

      if (editSpace || feishuBoundUser?.id) {
        const updateData: SvcUpdateSpaceReq = {
          title: data.title,
          opt: platformOpt,
        };
        await putAdminKbKbIdSpaceSpaceId({ kbId: kb_id, spaceId: editSpace?.id || feishuBoundUser?.id || 0 }, updateData);
        message.success('修改成功');
      } else {
        const spaceData: SvcCreateSpaceReq = {
          title: data.title,
          platform: selectedPlatform,
          opt: platformOpt,
        };
        const newSpaceId = await postAdminKbKbIdSpace({ kbId: kb_id }, spaceData);
        // 创建成功后：选中新建空间并打开获取知识库弹窗
        if (selectedPlatform === PlatformPlatformType.PlatformDingtalk) {
          console.log(newSpaceId);
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

  const handleSpaceClick = (space: SvcListSpaceItem) => {
    setSelectedSpaceId(space.id || null);
    // 如果当前在详情页，点击知识库时返回列表页
    if (location.pathname.includes('/kb/detail')) {
      // 导航回列表页，保留 id 参数
      navigate(`/admin/ai/kb?id=${kb_id}`);
    }
  };

  const handleFolderToggle = (folderId?: string) => {
    if (!folderId) return;
    const isSelected = selectedFolders.includes(folderId);
    
    if (isSelected) {
      // 取消选择文件夹时，同时取消选择该文件夹下的所有子文档
      setSelectedFolders(prev => prev.filter(id => id !== folderId));
      const folderDocs = docDetails[folderId] || [];
      setSelectedDocs(prev => {
        const newSet = new Set(prev);
        folderDocs.forEach(doc => {
          if (doc.doc_id) {
            newSet.delete(doc.doc_id);
          }
        });
        return newSet;
      });
    } else {
      // 选择文件夹时，同时选择该文件夹下的所有子文档
      setSelectedFolders(prev => [...prev, folderId]);
      const folderDocs = docDetails[folderId] || [];
      setSelectedDocs(prev => {
        const newSet = new Set(prev);
        folderDocs.forEach(doc => {
          if (doc.doc_id) {
            newSet.add(doc.doc_id);
          }
        });
        return newSet;
      });
    }
  };

  // 切换文档选择状态
  const handleDocToggle = (docId?: string, folderId?: string) => {
    if (!docId) return;
    
    const isSelected = selectedDocs.has(docId);
    
    if (isSelected) {
      // 取消选择文档
      setSelectedDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(docId);
        return newSet;
      });
      
      // 如果该文件夹下的所有文档都被取消选择，则取消选择文件夹
      if (folderId) {
        const folderDocs = docDetails[folderId] || [];
        const remainingSelected = folderDocs.filter(
          doc => doc.doc_id && doc.doc_id !== docId && selectedDocs.has(doc.doc_id)
        );
        if (remainingSelected.length === 0 && selectedFolders.includes(folderId)) {
          setSelectedFolders(prev => prev.filter(id => id !== folderId));
        }
      }
    } else {
      // 选择文档
      setSelectedDocs(prev => {
        const newSet = new Set(prev);
        newSet.add(docId);
        return newSet;
      });
      
      // 如果该文件夹下的所有文档都被选择，则自动选择文件夹
      if (folderId) {
        const folderDocs = docDetails[folderId] || [];
        const allDocsSelected = folderDocs.every(
          doc => !doc.doc_id || doc.doc_id === docId || selectedDocs.has(doc.doc_id)
        );
        if (allDocsSelected && !selectedFolders.includes(folderId)) {
          setSelectedFolders(prev => [...prev, folderId]);
        }
      }
    }
  };

  const handleSelectAll = () => {
    const allFolderIds: string[] = [];
    const allDocIds: string[] = [];

    // 收集所有文件夹和文档的 ID
    remoteData?.items?.forEach(folder => {
      if (folder.doc_id) {
        allFolderIds.push(folder.doc_id);
        // 收集该文件夹下的所有文档
        const folderDocs = docDetails[folder.doc_id] || [];
        folderDocs.forEach(doc => {
          if (doc.doc_id) {
            allDocIds.push(doc.doc_id);
          }
        });
      }
    });

    const allSelected = 
      selectedFolders.length === allFolderIds.length && 
      selectedDocs.size === allDocIds.length &&
      (allFolderIds.length > 0 || allDocIds.length > 0);

    if (allSelected) {
      // 取消全选
      setSelectedFolders([]);
      setSelectedDocs(new Set());
    } else {
      // 全选
      setSelectedFolders(allFolderIds);
      setSelectedDocs(new Set(allDocIds));
    }
  };

  const handleImportFolders = async () => {
    if (!selectedSpaceId) return;
    
    // 收集要导入的文档
    const docsToImport: SvcCreateSpaceForlderItem[] = [];
    
    // 遍历所有文件夹（包括选中的和包含选中文档的）
    remoteData?.items?.forEach(folder => {
      if (!folder.doc_id) return;
      
      // 获取该文件夹下的所有文档
      const folderDocs = docDetails[folder.doc_id] || [];
      
      // 收集该文件夹下被选中的文档 ID
      const selectedChildDocIds: string[] = [];
      folderDocs.forEach(doc => {
        if (doc.doc_id && selectedDocs.has(doc.doc_id)) {
          selectedChildDocIds.push(doc.doc_id);
        }
      });
      
      const isFolderSelected = selectedFolders.includes(folder.doc_id);
      const hasSelectedDocs = selectedChildDocIds.length > 0;
      
      // 如果文件夹被选中，或者文件夹下有文档被选中
      if (isFolderSelected || hasSelectedDocs) {
        if (hasSelectedDocs) {
          // 如果文件夹下有文档被单独选中，使用 child_doc_ids
          docsToImport.push({
            doc_id: folder.doc_id,
            title: folder.title,
            child_doc_ids: selectedChildDocIds,
          });
        } else if (isFolderSelected) {
          // 如果文件夹被选中但没有文档被单独选中，则导入整个文件夹（不使用 child_doc_ids）
          docsToImport.push({
            doc_id: folder.doc_id,
            title: folder.title,
          });
        }
      }
    });
    
    // 添加单独选中的文档（这些文档的父文件夹可能没有被选中，或者父文件夹被选中但文档被单独选择）
    remoteData?.items?.forEach(folder => {
      if (folder.doc_id) {
        const folderDocs = docDetails[folder.doc_id] || [];
        folderDocs.forEach(doc => {
          const docId = doc.doc_id;
          if (docId && selectedDocs.has(docId)) {
            // 检查该文档的父文件夹是否已经被导入（作为整个文件夹）
            const parentFolderImported = docsToImport.some(d => d.doc_id === folder.doc_id && !d.child_doc_ids);
            // 如果父文件夹没有被导入，则单独导入这个文档
            if (!parentFolderImported) {
              // 检查是否已经通过 child_doc_ids 导入了
              const parentFolderImportedWithChildren = docsToImport.some(
                d => d.doc_id === folder.doc_id && d.child_doc_ids?.includes(docId)
              );
              if (!parentFolderImportedWithChildren) {
                docsToImport.push({
                  doc_id: docId,
                  title: doc.title,
                });
              }
            }
          }
        });
      }
    });
    
    if (docsToImport.length === 0) {
      message.warning('请选择要导入的文档');
      return;
    }
    
    try {
      await postAdminKbKbIdSpaceSpaceIdFolder(
        { kbId: kb_id, spaceId: selectedSpaceId },
        {
          docs: docsToImport as any,
        }
      );
      // 刷新文件夹列表
      refreshFolders();
    } catch {
      message.error('导入失败');
      return;
    }

    message.success('导入学习已开始');
    setShowImportModal(false);
    setSelectedFolders([]);
    setSelectedDocs(new Set());
  };

  // 获取文档详情
  const handleGetDocDetails = async (spaceId?: string) => {
    if (!spaceId) return;
    if (!selectedSpaceId) return;

    try {
      const response = await getAdminKbKbIdSpaceSpaceIdRemote({
        spaceId: selectedSpaceId,
        kbId: kb_id,
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

        {/* 右侧内容区域 */}
        <Grid size={{ xs: 12 }} sx={{ height: '100%', flex: 1, minWidth: 0 }}>
          {/* 如果有子路由，使用 Outlet 渲染；否则显示文件夹列表 */}
          {location.pathname.includes('/kb/detail') ? (
            <Outlet />
          ) : (
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
                    <Icon
                      type="icon-tongyongwendang-moren"
                      sx={{ color: 'text.secondary', fontSize: 20, flexShrink: 0 }}
                    />
                    <Stack sx={{ width: '35%', minWidth: 0 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 500, fontSize: '14px', mb: 0.5 }}
                      >
                        {folder.title}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontSize: '12px',
                            mb: 0.5,
                            '& b': { color: 'text.primary' },
                          }}
                        >
                          同步成功 <b>{folder.success || 0}</b> 个
                          {(folder.failed || 0) > 0 && (
                            <>
                              ，同步失败 <b>{folder.failed || 0}</b> 个
                            </>
                          )}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            // 使用相对路径导航，确保保留父路由的 id 参数
                            const currentSearch = searchParams.toString();
                            const newSearch = new URLSearchParams(currentSearch);
                            newSearch.set('spaceId', String(selectedSpaceId));
                            newSearch.set('folderId', String(folder.id));
                            newSearch.set('folderTitle', folder.title || '');
                            // 确保 id 参数存在
                            if (!newSearch.get('id')) {
                              newSearch.set('id', String(kb_id));
                            }
                            navigate(`detail?${newSearch.toString()}`);
                          }}
                          sx={{ minWidth: 'auto', px: 1.5, py: 0.25, fontSize: '12px' }}
                        >
                          查看
                        </Button>
                      </Stack>
                    </Stack>
                    <Box sx={{ width: '100px', flexShrink: 0 }}>
                      <StatusBadge status={folder.status} />
                    </Box>
                    <Box sx={{ flex: 1 }} />
                    <Stack alignItems="flex-end" spacing={1} sx={{ flexShrink: 0 }}>
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
          dingtalkStep === 1 && !editSpace ? handleDingtalkNextStep : handleSubmit(handleModalOk)
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
          dingtalkStep === 2 ? (
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
        {[PlatformPlatformType.PlatformDingtalk, PlatformPlatformType.PlatformFeishu].includes(
          selectedPlatform
        ) ? (
          // 钉钉和飞书文档配置
          <Stack spacing={3}>
            {dingtalkStep !== 2 ? (
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
                {selectedPlatform === PlatformPlatformType.PlatformDingtalk && (
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Tabs
                      value={identifierType}
                      onChange={(_, value) =>
                        setValue('identifier_type', value as 'unionid' | 'phone')
                      }
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        p: '4px',
                        border: '1px solid',
                        borderColor: 'rgba(0, 0, 0, 0.23)',
                        minHeight: 40,
                        height: 40,
                        backgroundColor: 'transparent',
                        borderRadius: '4px',
                        flexShrink: 0,
                        '& .MuiTabs-indicator': {
                          top: '50%',
                          bottom: 'auto',
                          transform: 'translateY(-50%)',
                          height: 32,
                          borderRadius: '4px',
                          backgroundColor: '#1F2329',
                        },
                      }}
                    >
                      <Tab
                        value="unionid"
                        label="unionid"
                        sx={{
                          zIndex: 1,
                          px: 2,
                          py: 0.5,
                          minHeight: 32,
                          height: 32,
                          minWidth: 0,
                          fontSize: '14px',
                          textTransform: 'none',
                          color: 'text.secondary',
                          '&.Mui-selected': {
                            color: '#fff',
                          },
                        }}
                      />
                      <Tab
                        value="phone"
                        label="手机号"
                        sx={{
                          zIndex: 1,
                          px: 2,
                          py: 0.5,
                          minHeight: 32,
                          height: 32,
                          minWidth: 0,
                          fontSize: '14px',
                          textTransform: 'none',
                          color: 'text.secondary',
                          '&.Mui-selected': {
                            color: '#fff',
                          },
                        }}
                      />
                    </Tabs>
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
                  </Stack>
                )}
                {selectedPlatform === PlatformPlatformType.PlatformFeishu && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: 1 }}>
                      绑定账号
                    </Typography>
                    {watch('user_third_id') ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 2,
                          border: '1px solid',
                          borderColor: needsRebind ? 'error.main' : 'divider',
                          borderRadius: 1,
                          bgcolor: needsRebind ? 'error.lighter' : 'grey.50',
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              bgcolor: needsRebind ? 'error.main' : 'primary.main',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: 500,
                            }}
                          >
                            {watch('username')?.[0]?.toUpperCase() || 'U'}
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {watch('username') || '未知用户'}
                          </Typography>
                          <Chip
                            label={needsRebind ? '信息已变更，请重新绑定' : '已绑定'}
                            size="small"
                            color={needsRebind ? 'error' : 'success'}
                            sx={{
                              height: 20,
                              fontSize: '12px',
                              '& .MuiChip-label': {
                                px: 1,
                              },
                            }}
                          />
                        </Stack>
                        <Tooltip title="解除绑定" arrow>
                          <IconButton
                            size="small"
                            onClick={handleUnbindFeishuAccount}
                            sx={{
                              color: 'text.secondary',
                              '&:hover': {
                                color: 'error.main',
                                bgcolor: 'error.lighter',
                              },
                            }}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Button
                        variant="outlined"
                        onClick={handleBindFeishuAccount}
                        disabled={!watch('app_id') || !watch('secret')}
                        sx={{ width: '100%' }}
                      >
                        绑定账号
                      </Button>
                    )}
                  </>
                )}
              </>
            ) : selectedPlatform === PlatformPlatformType.PlatformDingtalk ? (
              // 第二步：配置指导（仅钉钉显示）
              <Stack spacing={3}>
                <Typography variant="h6" sx={{ textAlign: 'center', fontWeight: 600 }}>
                  配置订阅事件
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    gap: 3,
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: 'flex-start',
                  }}
                >
                  {/* 步骤1 */}
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      gap={1.5}
                      sx={{ mb: 2, minHeight: 48 }}
                    >
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '4px',
                          backgroundColor: '#1F2329',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          flexShrink: 0,
                        }}
                      >
                        1
                      </Box>
                      <Typography variant="body2" sx={{ lineHeight: 1.6, flex: 1 }}>
                        导航前往
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          应用详情-开发配置-事件订阅
                        </Box>
                        ，选择{' '}
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          Stream 模式推送
                        </Box>
                        ，点击按钮进行验证。
                      </Typography>
                    </Stack>
                    <img
                      src={dingtalk_screen_1}
                      alt="钉钉配置步骤1"
                      style={{
                        width: '100%',
                        height: 250,
                        borderRadius: 8,
                        cursor: 'pointer',
                        objectFit: 'cover',
                      }}
                      onClick={() => handleImagePreview(dingtalk_screen_1, '钉钉配置步骤1')}
                    />
                  </Box>

                  {/* 步骤2 */}
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      gap={1.5}
                      sx={{ mb: 2, minHeight: 48 }}
                    >
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '4px',
                          backgroundColor: '#1F2329',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          flexShrink: 0,
                        }}
                      >
                        2
                      </Box>
                      <Typography variant="body2" sx={{ lineHeight: 1.6, flex: 1 }}>
                        验证通过后，下方事件订阅启用
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          钉钉文档导出完成事件
                        </Box>
                        。
                      </Typography>
                    </Stack>
                    <img
                      src={dingtalk_screen_2}
                      alt="钉钉配置步骤2"
                      style={{
                        width: '100%',
                        height: 250,
                        borderRadius: 8,
                        cursor: 'pointer',
                        objectFit: 'cover',
                      }}
                      onClick={() => handleImagePreview(dingtalk_screen_2, '钉钉配置步骤2')}
                    />
                  </Box>
                </Box>
              </Stack>
            ) : null}
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
                  const allDocIds: string[] = [];
                  remoteData?.items?.forEach(folder => {
                    if (folder.doc_id) {
                      allFolderIds.push(folder.doc_id);
                      const folderDocs = docDetails[folder.doc_id] || [];
                      folderDocs.forEach(doc => {
                        if (doc.doc_id) allDocIds.push(doc.doc_id);
                      });
                    }
                  });
                  return (
                    selectedFolders.length === allFolderIds.length && 
                    selectedDocs.size === allDocIds.length &&
                    (allFolderIds.length > 0 || allDocIds.length > 0)
                  );
                })()}
                indeterminate={(() => {
                  const allFolderIds: string[] = [];
                  const allDocIds: string[] = [];
                  remoteData?.items?.forEach(folder => {
                    if (folder.doc_id) {
                      allFolderIds.push(folder.doc_id);
                      const folderDocs = docDetails[folder.doc_id] || [];
                      folderDocs.forEach(doc => {
                        if (doc.doc_id) allDocIds.push(doc.doc_id);
                      });
                    }
                  });
                  const hasSelectedFolders = selectedFolders.length > 0;
                  const hasSelectedDocs = selectedDocs.size > 0;
                  const allFoldersSelected = selectedFolders.length === allFolderIds.length && allFolderIds.length > 0;
                  const allDocsSelected = allDocIds.length > 0 && allDocIds.every(id => selectedDocs.has(id));
                  return (hasSelectedFolders || hasSelectedDocs) && !(allFoldersSelected && allDocsSelected);
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
                          indeterminate={
                            folder.doc_id &&
                            expandedDocs.has(folder.doc_id) &&
                            docDetails[folder.doc_id]
                              ? docDetails[folder.doc_id].some(
                                  doc => doc.doc_id && selectedDocs.has(doc.doc_id)
                                ) &&
                                !docDetails[folder.doc_id].every(
                                  doc => !doc.doc_id || selectedDocs.has(doc.doc_id)
                                )
                              : false
                          }
                          onChange={() => handleFolderToggle(folder.doc_id)}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={folder.title}
                        secondary={
                          folder.doc_id && expandedDocs.has(folder.doc_id) && docDetails[folder.doc_id]
                            ? `${docDetails[folder.doc_id].length} 个文档${
                                Array.from(docDetails[folder.doc_id]).some(
                                  doc => doc.doc_id && selectedDocs.has(doc.doc_id)
                                )
                                  ? ` (已选择 ${Array.from(docDetails[folder.doc_id]).filter(
                                      doc => doc.doc_id && selectedDocs.has(doc.doc_id)
                                    ).length} 个)`
                                  : ''
                              }`
                            : folder.doc_id && docDetails[folder.doc_id]
                              ? `${docDetails[folder.doc_id].length} 个文档（点击获取文档查看）`
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
                              return handleGetDocDetails(folder.doc_id);
                            } else if (folder.doc_id) {
                              return setExpandedDocs(prev => {
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
                                  borderColor: doc.doc_id && selectedDocs.has(doc.doc_id) ? 'primary.main' : 'divider',
                                  borderRadius: 1,
                                  bgcolor: doc.doc_id && selectedDocs.has(doc.doc_id) ? 'primary.lighter' : 'grey.50',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    borderColor: 'primary.main',
                                  },
                                }}
                              >
                                <Stack direction="row" alignItems="center" spacing={2}>
                                  <Checkbox
                                    checked={doc.doc_id ? selectedDocs.has(doc.doc_id) : false}
                                    onChange={() => handleDocToggle(doc.doc_id, folder.doc_id)}
                                    size="small"
                                  />
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

      {/* 查看同步结果（成功/失败） */}
      <Modal
        open={showDocStatusModal}
        onCancel={closeDocStatusModal}
        onOk={closeDocStatusModal}
        okText="关闭"
        cancelText="取消"
        title="查看知识库"
        width={900}
      >
        {(() => {
          // 根据 folderDocs 计算成功和失败的数量
          const success = folderDocs.filter(
            d => d.status === ModelDocStatus.DocStatusApplySuccess
          ).length;
          const failed = folderDocs.filter(
            d =>
              d.status === ModelDocStatus.DocStatusApplyFailed ||
              d.status === ModelDocStatus.DocStatusExportFailed
          ).length;

          const q = docStatusSearch.trim().toLowerCase();
          const docsAfterSearch = folderDocs.filter(d => (d.title || '').toLowerCase().includes(q));
          const docsAfterFilter =
            docStatusTab === 'all'
              ? docsAfterSearch
              : docsAfterSearch.filter(d => {
                  return docStatusTab === 'success'
                    ? ModelDocStatus.DocStatusApplySuccess === d.status
                    : [
                        ModelDocStatus.DocStatusApplyFailed,
                        ModelDocStatus.DocStatusExportFailed,
                      ].includes(d.status!);
                });
          
          const renderStatusIcon = (doc: SvcDocListItem) => {
            const state = getDocSyncState(doc.status);
            const iconBoxSx = { width: 24, height: 24, display: 'flex', alignItems: 'center' };
            if (state === 'success') {
              return (
                <Box sx={iconBoxSx}>
                  <CheckCircleIcon fontSize="small" color="success" />
                </Box>
              );
            }
            if (state === 'failed') {
              const id = doc.id;
              const title =
                id && docFailReasonLoadingById[id]
                  ? '加载失败原因中...'
                  : id
                    ? docFailReasonById[id] || '悬停查看失败原因'
                    : '悬停查看失败原因';
              return (
                <Box sx={iconBoxSx}>
                  <Tooltip
                    title={title}
                    arrow
                    onOpen={() => ensureDocFailReason(id)}
                    placement="top"
                  >
                    <Box component="span" sx={{ display: 'inline-flex' }}>
                      <CancelIcon fontSize="small" color="error" />
                    </Box>
                  </Tooltip>
                </Box>
              );
            }
            if (state === 'syncing') {
              return (
                <Box sx={iconBoxSx}>
                  <AutorenewIcon
                    fontSize="small"
                    sx={{
                      color: 'text.secondary',
                      animation: 'kbDocSpin 1s linear infinite',
                      '@keyframes kbDocSpin': {
                        from: { transform: 'rotate(0deg)' },
                        to: { transform: 'rotate(360deg)' },
                      },
                    }}
                  />
                </Box>
              );
            }
            return (
              <Box sx={iconBoxSx}>
                <DescriptionIcon fontSize="small" sx={{ color: 'text.disabled' }} />
              </Box>
            );
          };

          // 编辑单个项目的分类
          const handleEditCategory = (item: SvcDocListItem) => {
            categoryEdit.handleEditCategory(item);
          };

          const columns: ColumnsType<SvcDocListItem> = [
            {
              title: '状态',
              dataIndex: 'status',
              width: 80,
              render: (_, record) => {
                return renderStatusIcon(record);
              },
            },
            {
              title: '标题',
              dataIndex: 'title',
              render: (_, record) => {
                return <Typography variant="body2">{record?.title || '-'}</Typography>;
              },
            },
            {
              title: '标签',
              dataIndex: 'group_ids',
              render: (_, record) => {
                return (
                  <CategoryDisplay
                    itemIds={record.group_ids || []}
                    onClick={() => handleEditCategory(record)}
                  />
                );
              },
            },
            {
              title: '更新时间',
              dataIndex: 'updated_at',
              width: 180,
              render: (_, record) => {
                return record.updated_at ? formatDate(record.updated_at) : '-';
              },
            },
          ];

          return (
            <Stack spacing={2}>
              <Stack spacing={1} direction="row" alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                  {docStatusFolder?.title || '文档'}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flex: 1 }} alignItems="center">
                  <Chip
                    size="small"
                    color="success"
                    variant={docStatusTab === 'success' ? 'filled' : 'outlined'}
                    label={`同步成功: ${success}`}
                    onClick={() => setDocStatusTab(docStatusTab === 'success' ? 'all' : 'success')}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        opacity: 0.8,
                      },
                    }}
                  />
                  {failed > 0 && (
                    <Chip
                      size="small"
                      color="error"
                      variant={docStatusTab === 'failed' ? 'filled' : 'outlined'}
                      label={`同步失败: ${failed}`}
                      onClick={() => setDocStatusTab(docStatusTab === 'failed' ? 'all' : 'failed')}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          opacity: 0.8,
                        },
                      }}
                    />
                  )}
                  {docStatusTab === 'failed' && failed > 0 && (
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={() =>
                        handleRetryFailedDocs(
                          docsAfterFilter
                            ?.map(i => i?.id)
                            .filter((id): id is number => id !== undefined) || []
                        )
                      }
                      sx={{ ml: 'auto!important' }}
                    >
                      重试
                    </Button>
                  )}
                </Stack>
              </Stack>

              <TextField
                size="small"
                placeholder="搜索文档..."
                value={docStatusSearch}
                onChange={e => setDocStatusSearch(e.target.value)}
                fullWidth
              />

              <Divider />

              <Table
                columns={columns}
                dataSource={docsAfterFilter.map((doc, index) => ({ ...doc, _rowKey: doc.id || doc.doc_id || `row-${index}` }))}
                rowKey="_rowKey"
                pagination={false}
                loading={false}
              />
            </Stack>
          );
        })()}
      </Modal>
      
      {/* 编辑单个项目分类弹窗 */}
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
