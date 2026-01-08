import {
  getAdminKbKbIdDocumentDocId,
  getAdminKbKbIdSpaceSpaceIdFolder,
  getAdminKbKbIdSpaceSpaceIdFolderFolderIdDoc,
  ModelDocStatus,
  ModelDocType,
  ModelFileType,
  putAdminKbKbIdSpaceSpaceIdFolderFolderId,
  SvcDocListItem,
  SvcListSpaceFolderItem,
  TopicKBSpaceUpdateType,
} from '@/api';
import CategoryDisplay from '@/components/CategoryDisplay';
import CategoryItemSelector from '@/components/CategoryItemSelector';
import { BatchEditCategoryButtons } from '@/components/BatchEditCategoryButtons';
import { useCategoryEdit } from '@/hooks/useCategoryEdit';
import { Card, message, Modal } from '@ctzhian/ui';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Checkbox,
  CircularProgress,
  Paper,
} from '@mui/material';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

const KnowledgeBaseDetailPage = () => {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const navigate = useNavigate();

  // 优先从路由参数获取，如果没有则从查询参数获取
  const kb_id_from_params = params.id ? Number(params.id) : 0;
  const kb_id_from_query = searchParams.get('id') ? Number(searchParams.get('id')) : 0;
  const kb_id = kb_id_from_params || kb_id_from_query;

  const spaceId = +searchParams.get('spaceId')!;
  const folderId = +searchParams.get('folderId')!;

  // 所有 Hooks 必须在早期返回之前调用
  const [docStatusSearch, setDocStatusSearch] = useState('');
  const [docStatusTab, setDocStatusTab] = useState<'all' | 'success' | 'failed' | 'syncing'>('all');
  const [docFailReasonById, setDocFailReasonById] = useState<Record<number, string>>({});
  const [docFailReasonLoadingById, setDocFailReasonLoadingById] = useState<Record<number, boolean>>(
    {}
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 树形结构状态
  interface TreeNodeState {
    expanded: boolean;
    children: SvcDocListItem[];
    page: number;
    hasMore: boolean;
    loading: boolean;
    total: number;
  }
  const [treeNodeStates, setTreeNodeStates] = useState<Map<number, TreeNodeState>>(new Map());
  const [rootNodes, setRootNodes] = useState<SvcDocListItem[]>([]);
  const [rootPage, setRootPage] = useState(1);
  const [rootHasMore, setRootHasMore] = useState(true);
  const [rootLoading, setRootLoading] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstMountForSearchRef = useRef(true);
  const isFirstMountForTabRef = useRef(true);

  // 递归收集节点及其所有子节点的ID
  const collectNodeAndAllChildrenIds = (
    nodeId: number,
    states: Map<number, TreeNodeState>
  ): number[] => {
    const ids: number[] = [nodeId];
    const state = states.get(nodeId);

    if (state && state.children.length > 0) {
      state.children.forEach(child => {
        if (child.id) {
          ids.push(...collectNodeAndAllChildrenIds(child.id, states));
        }
      });
    }

    return ids;
  };

  // 递归更新树节点的标签
  const updateNodesGroupIds = (
    nodes: SvcDocListItem[],
    updatedIds: number[],
    newGroupIds: number[]
  ): SvcDocListItem[] => {
    return nodes.map(node => {
      if (updatedIds.includes(node.id!)) {
        return { ...node, group_ids: newGroupIds };
      }
      return node;
    });
  };

  // 使用分类编辑hook
  const categoryEdit = useCategoryEdit({
    kbId: kb_id || 0, // 使用默认值避免在无效时出错
    docType: ModelDocType.DocTypeSpace,
    onSuccess: (updatedIds, newGroupIds) => {
      // 扩展更新ID列表，包含所有被更新节点的子节点
      const allAffectedIds: number[] = [];

      updatedIds.forEach(id => {
        // 添加父节点ID
        allAffectedIds.push(id);
        // 添加所有子节点ID
        const childIds = collectNodeAndAllChildrenIds(id, treeNodeStates);
        allAffectedIds.push(...childIds.filter(childId => childId !== id));
      });

      // 去重
      const uniqueAffectedIds = Array.from(new Set(allAffectedIds));

      // 直接更新本地数据，不重新请求
      // 更新根节点
      setRootNodes(prevNodes => updateNodesGroupIds(prevNodes, uniqueAffectedIds, newGroupIds));

      // 更新树节点状态中的子节点
      setTreeNodeStates(prevStates => {
        const newStates = new Map(prevStates);
        newStates.forEach((state, key) => {
          if (state.children.length > 0) {
            newStates.set(key, {
              ...state,
              children: updateNodesGroupIds(state.children, uniqueAffectedIds, newGroupIds),
            });
          }
        });
        return newStates;
      });
    },
  });

  // 将状态筛选转换为 API 参数
  const getStatusFilter = (): (0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)[] | undefined => {
    if (docStatusTab === 'success') {
      return [ModelDocStatus.DocStatusApplySuccess];
    }
    if (docStatusTab === 'failed') {
      return [ModelDocStatus.DocStatusApplyFailed, ModelDocStatus.DocStatusExportFailed];
    }
    if (docStatusTab === 'syncing') {
      return [
        ModelDocStatus.DocStatusUnknown,
        ModelDocStatus.DocStatusPendingReview,
        ModelDocStatus.DocStatusPendingApply,
        ModelDocStatus.DocStatusAppling,
        ModelDocStatus.DocStatusPendingExport,
        ModelDocStatus.DocStatusExportSuccess,
      ];
    }
    return undefined; // 'all' 时不传 status 参数
  };

  // 加载根节点列表
  const loadRootNodes = async (page: number = 1, append: boolean = false) => {
    if (!spaceId || !folderId || !kb_id) return;

    setRootLoading(true);
    try {
      const statusFilter = getStatusFilter();
      const response = await getAdminKbKbIdSpaceSpaceIdFolderFolderIdDoc({
        kbId: kb_id,
        spaceId: spaceId,
        folderId: String(folderId),
        page: page,
        size: 10,
        status: statusFilter,
        title: docStatusSearch.trim() || undefined,
        parent_id: folderId, // 根节点使用 folderId 作为 parent_id
      });

      const items = response?.items || [];
      const total = response?.total || 0;

      if (append) {
        setRootNodes(prev => [...prev, ...items]);
      } else {
        setRootNodes(items);
      }

      setRootHasMore(rootNodes.length + items.length < total);
      setRootPage(page);
    } catch {
      message.error('加载文档列表失败');
    } finally {
      setRootLoading(false);
    }
  };

  // 加载子节点列表
  const loadChildNodes = async (parentId: number, page: number = 1, append: boolean = false) => {
    if (!spaceId || !kb_id) return;

    setTreeNodeStates(prev => {
      const newMap = new Map(prev);
      const state = newMap.get(parentId) || {
        expanded: true,
        children: [],
        page: 0,
        hasMore: true,
        loading: false,
        total: 0,
      };
      newMap.set(parentId, { ...state, loading: true });
      return newMap;
    });

    try {
      const statusFilter = getStatusFilter();
      const response = await getAdminKbKbIdSpaceSpaceIdFolderFolderIdDoc({
        kbId: kb_id,
        spaceId: spaceId,
        folderId: String(folderId),
        page: page,
        size: 10,
        status: statusFilter,
        title: docStatusSearch.trim() || undefined,
        parent_id: parentId, // 使用父节点的 id
      });

      const items = response?.items || [];
      const total = response?.total || 0;

      setTreeNodeStates(prev => {
        const newMap = new Map(prev);
        const state = newMap.get(parentId)!;
        const newChildren = append ? [...state.children, ...items] : items;
        newMap.set(parentId, {
          ...state,
          children: newChildren,
          page: page,
          hasMore: newChildren.length < total,
          loading: false,
          total: total,
        });
        return newMap;
      });
    } catch {
      message.error('加载子节点失败');
      setTreeNodeStates(prev => {
        const newMap = new Map(prev);
        const state = newMap.get(parentId);
        if (state) {
          newMap.set(parentId, { ...state, loading: false });
        }
        return newMap;
      });
    }
  };

  // 获取文件夹统计信息（使用文件夹列表接口，更轻量）
  const { data: folderListData, run: fetchStats } = useRequest(
    () => {
      if (!spaceId || !kb_id) {
        return Promise.resolve(null);
      }
      return getAdminKbKbIdSpaceSpaceIdFolder({
        kbId: kb_id,
        spaceId: spaceId,
      });
    },
    {
      manual: true,
    }
  );

  // 从文件夹列表中获取当前文件夹的统计信息
  const currentFolder: SvcListSpaceFolderItem | undefined = folderListData?.items?.find(
    folder => folder.id === folderId
  );

  // 从文件夹数据中获取统计信息
  const success = currentFolder?.success || 0;
  const failed = currentFolder?.failed || 0;
  const totalDocs = currentFolder?.total || 0;
  const syncing = totalDocs - success - failed;

  // 刷新所有已展开的节点
  const refreshAllNodes = () => {
    if (!spaceId || !folderId || !kb_id) return;

    // 刷新根节点（不追加，直接替换）
    loadRootNodes(1, false);

    // 刷新所有已展开的节点
    treeNodeStates.forEach((state, parentId) => {
      if (state.expanded && state.page > 0) {
        loadChildNodes(parentId, 1, false);
      }
    });

    // 刷新统计信息
    fetchStats();
  };

  // 启动轮询
  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = setInterval(() => {
      if (spaceId && folderId && kb_id) {
        refreshAllNodes();
      } else {
        stopPolling();
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

  // 检查是否有同步中的文档（使用文件夹状态判断）
  useEffect(() => {
    if (!kb_id) return;
    // 如果文件夹状态不是成功或失败，说明有同步中的文档
    const hasSyncing =
      currentFolder?.status !== undefined &&
      currentFolder.status !== ModelDocStatus.DocStatusApplySuccess &&
      currentFolder.status !== ModelDocStatus.DocStatusApplyFailed &&
      currentFolder.status !== ModelDocStatus.DocStatusExportFailed;

    // 或者通过统计数量判断
    const hasSyncingByCount = syncing > 0;

    if (hasSyncing || hasSyncingByCount) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolder?.status, syncing, kb_id]);

  // 组件卸载时清理轮询定时器
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // 统一处理数据获取：路由参数变化、筛选/分页变化
  useEffect(() => {
    if (spaceId && folderId && kb_id) {
      loadRootNodes(1, false);
      fetchStats(); // 同时获取统计信息
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, folderId, kb_id]);

  // 当筛选条件变化时，重新获取数据（重置状态）
  useEffect(() => {
    // 跳过首次挂载，避免与初始加载重复请求
    if (isFirstMountForTabRef.current) {
      isFirstMountForTabRef.current = false;
      return;
    }

    if (spaceId && folderId && kb_id) {
      setRootNodes([]);
      setRootPage(1);
      setRootHasMore(true);
      setTreeNodeStates(new Map());
      loadRootNodes(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docStatusTab]);

  // 搜索条件变化时，使用防抖延迟请求
  useEffect(() => {
    // 跳过首次挂载，避免与初始加载重复请求
    if (isFirstMountForSearchRef.current) {
      isFirstMountForSearchRef.current = false;
      return;
    }

    if (spaceId && folderId && kb_id) {
      // 清除之前的定时器
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
      // 设置新的防抖定时器
      searchDebounceTimerRef.current = setTimeout(() => {
        setRootNodes([]);
        setRootPage(1);
        setRootHasMore(true);
        setTreeNodeStates(new Map());
        loadRootNodes(1, false);
      }, 500); // 500ms 防抖
    }

    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docStatusSearch]);

  // 如果 kb_id 无效，返回错误提示（在所有 Hooks 调用之后）
  if (!kb_id || kb_id <= 0 || Number.isNaN(kb_id)) {
    return (
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Stack spacing={2} alignItems="center">
          <Typography variant="h6" color="error">
            知识库ID无效
          </Typography>
          <Typography variant="body2" color="text.secondary">
            路由参数: {params.id || '无'} | 查询参数: {searchParams.get('id') || '无'}
          </Typography>
          <Button variant="contained" onClick={() => navigate(-1)}>
            返回
          </Button>
        </Stack>
      </Card>
    );
  }

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

  const handleRetryFailedDocs = async () => {
    if (!spaceId || !folderId) return;

    try {
      await putAdminKbKbIdSpaceSpaceIdFolderFolderId(
        {
          kbId: kb_id,
          spaceId: spaceId,
          folderId: folderId,
        },
        { update_type: TopicKBSpaceUpdateType.KBSpaceUpdateTypeFailed }
      );
      message.success('重试同步已开始');
      refreshAllNodes();
    } catch {
      message.error('重试同步失败');
    }
  };

  // 确认编辑单个项目的分类
  const handleConfirmEditCategory = async () => {
    await categoryEdit.handleConfirmEditCategory();
  };

  // 编辑单个项目的分类
  const handleEditCategory = (item: SvcDocListItem) => {
    categoryEdit.handleEditCategory(item);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    return dayjs(timestamp * 1000).format('YYYY-MM-DD HH:mm:ss');
  };

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
          <Tooltip title={title} arrow onOpen={() => ensureDocFailReason(id)} placement="top">
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

  // 递归渲染树节点
  const TreeNode = ({ doc, level = 0 }: { doc: SvcDocListItem; level?: number }) => {
    const docId = doc.id!;
    const isFolder = doc.file_type === ModelFileType.FileTypeFolder;
    const nodeState = treeNodeStates.get(docId);
    const isExpanded = nodeState?.expanded || false;
    const children = nodeState?.children || [];
    const hasMore = nodeState?.hasMore || false;
    const loading = nodeState?.loading || false;
    const isSelected = selectedRowKeys.includes(docId);

    // 计算是否为半选状态（有子节点被选中，但自己未被选中）
    const getIndeterminateState = (): boolean => {
      // 如果节点本身已被选中，不显示半选状态
      if (isSelected) return false;

      // 只有文件夹才可能有半选状态
      if (!isFolder || children.length === 0) return false;

      // 递归检查所有子节点，看是否有任何子节点被选中
      const checkAnyChildSelected = (childId: number): boolean => {
        if (selectedRowKeys.includes(childId)) return true;

        const childState = treeNodeStates.get(childId);
        if (childState && childState.children.length > 0) {
          return childState.children.some(grandChild =>
            grandChild.id ? checkAnyChildSelected(grandChild.id) : false
          );
        }
        return false;
      };

      return children.some(child => (child.id ? checkAnyChildSelected(child.id) : false));
    };

    const isIndeterminate = getIndeterminateState();

    const handleToggleExpand = async () => {
      if (!isExpanded) {
        // 展开节点，加载第一页子节点
        setTreeNodeStates(prev => {
          const newMap = new Map(prev);
          newMap.set(docId, {
            expanded: true,
            children: [],
            page: 0,
            hasMore: true,
            loading: false,
            total: 0,
          });
          return newMap;
        });
        await loadChildNodes(docId, 1, false);
      } else {
        // 收起节点
        setTreeNodeStates(prev => {
          const newMap = new Map(prev);
          const state = newMap.get(docId);
          if (state) {
            newMap.set(docId, { ...state, expanded: false });
          }
          return newMap;
        });
      }
    };

    const handleLoadMore = () => {
      if (nodeState && nodeState.page !== undefined) {
        loadChildNodes(docId, nodeState.page + 1, true);
      }
    };

    // 递归收集节点及其所有已加载子节点的ID
    const collectNodeAndChildrenIds = (nodeId: number): number[] => {
      const ids: number[] = [nodeId];
      const state = treeNodeStates.get(nodeId);

      if (state && state.children.length > 0) {
        state.children.forEach(child => {
          if (child.id) {
            // 递归收集子节点及其子节点
            ids.push(...collectNodeAndChildrenIds(child.id));
          }
        });
      }

      return ids;
    };

    const handleCheckboxChange = (checked: boolean) => {
      // 收集当前节点及其所有已加载的子节点ID
      const idsToToggle = collectNodeAndChildrenIds(docId);

      if (checked) {
        // 选中时，级联选中当前节点及其所有子节点（UI上显示选中状态）
        setSelectedRowKeys(prev => {
          // 使用 Set 去重
          const newKeys = new Set([...prev, ...idsToToggle]);
          return Array.from(newKeys);
        });
      } else {
        // 取消选中时，递归取消当前节点及其所有已加载的子节点
        setSelectedRowKeys(prev => prev.filter(key => !idsToToggle.includes(key as number)));
      }
    };

    return (
      <Box>
        {/* 当前节点 */}
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1.5,
            mb: 0.5,
            ml: level * 3,
            borderRadius: 1,
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          {/* 复选框 */}
          <Checkbox
            size="small"
            checked={isSelected}
            indeterminate={isIndeterminate}
            onChange={e => handleCheckboxChange(e.target.checked)}
            sx={{ mr: 1 }}
          />

          {/* 展开/收起按钮 - 只有文件夹才显示 */}
          {isFolder ? (
            <IconButton size="small" onClick={handleToggleExpand} sx={{ mr: 1, p: 0.5 }}>
              {loading && nodeState?.page === 0 ? (
                <CircularProgress size={16} />
              ) : isExpanded ? (
                <ExpandMoreIcon fontSize="small" />
              ) : (
                <ChevronRightIcon fontSize="small" />
              )}
            </IconButton>
          ) : (
            <Box sx={{ width: 32, mr: 1 }} />
          )}

          {/* 文件夹/文档图标 */}
          <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
            {isFolder ? (
              isExpanded ? (
                <FolderOpenIcon fontSize="small" sx={{ color: 'primary.main' }} />
              ) : (
                <FolderIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              )
            ) : (
              <DescriptionIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            )}
          </Box>

          {/* 状态图标 */}
          <Box sx={{ mr: 2 }}>{!isFolder && renderStatusIcon(doc)}</Box>

          {/* 文档名称 */}
          <Typography variant="body2" sx={{ flex: 1, fontWeight: level === 0 ? 500 : 400 }}>
            {doc.title || '-'}
          </Typography>

          {/* 标签 */}
          <Box sx={{ mr: 2, minWidth: 120 }}>
            {!isFolder && (
              <CategoryDisplay
                itemIds={doc.group_ids || []}
                onClick={() => handleEditCategory(doc)}
              />
            )}
          </Box>

          {/* 更新时间 */}
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
            {doc.updated_at ? formatDate(doc.updated_at) : '-'}
          </Typography>
        </Paper>

        {/* 子节点 - 只有文件夹才显示 */}
        {isFolder && isExpanded && (
          <Box>
            {children.map(child => (
              <TreeNode key={child.id} doc={child} level={level + 1} />
            ))}

            {/* 加载更多按钮 */}
            {hasMore && !loading && (
              <Box sx={{ ml: (level + 1) * 3, mt: 1, mb: 1 }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={handleLoadMore}
                  sx={{ textTransform: 'none' }}
                >
                  加载更多...
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>
    );
  };

  // 过滤出顶层选中的节点ID（排除那些父节点已被选中的子节点）
  const getTopLevelSelectedIds = (): number[] => {
    const selectedIds = selectedRowKeys.map(Number);
    const topLevelIds: number[] = [];

    // 递归检查一个节点的所有子节点ID
    const getAllChildIds = (nodeId: number): Set<number> => {
      const childIds = new Set<number>();
      const state = treeNodeStates.get(nodeId);

      if (state && state.children.length > 0) {
        state.children.forEach(child => {
          if (child.id) {
            childIds.add(child.id);
            // 递归添加子节点的子节点
            const grandChildIds = getAllChildIds(child.id);
            grandChildIds.forEach(id => childIds.add(id));
          }
        });
      }

      return childIds;
    };

    // 对于每个选中的ID，检查它是否是其他选中节点的子节点
    selectedIds.forEach(id => {
      let isChildOfSelected = false;

      // 检查这个ID是否是其他选中节点的子节点
      for (const otherId of selectedIds) {
        if (otherId !== id) {
          const childIds = getAllChildIds(otherId);
          if (childIds.has(id)) {
            isChildOfSelected = true;
            break;
          }
        }
      }

      // 如果不是其他选中节点的子节点，则是顶层选中的节点
      if (!isChildOfSelected) {
        topLevelIds.push(id);
      }
    });

    return topLevelIds;
  };

  // 获取文件夹标题（从URL参数或需要单独获取）
  const folderTitle = searchParams.get('folderTitle') || '知识库详情';

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'none' }}>
      {/* 标题 */}
      <Typography variant="body1" sx={{ mb: 3, fontWeight: 500, fontSize: '16px' }}>
        {folderTitle}
      </Typography>

      {/* 状态摘要、搜索框和批量操作 */}
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          {success > 0 && (
            <Chip
              size="small"
              color="success"
              variant={docStatusTab === 'success' ? 'filled' : 'outlined'}
              label={`同步成功: ${success}`}
              onClick={() => {
                const newTab = docStatusTab === 'success' ? 'all' : 'success';
                setDocStatusTab(newTab);
              }}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            />
          )}
          {syncing > 0 && (
            <Chip
              size="small"
              color="warning"
              variant={docStatusTab === 'syncing' ? 'filled' : 'outlined'}
              label={`同步中: ${syncing}`}
              onClick={() => {
                const newTab = docStatusTab === 'syncing' ? 'all' : 'syncing';
                setDocStatusTab(newTab);
              }}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            />
          )}
          {failed > 0 && (
            <Chip
              size="small"
              color="error"
              variant={docStatusTab === 'failed' ? 'filled' : 'outlined'}
              label={`同步失败: ${failed}`}
              onClick={() => {
                const newTab = docStatusTab === 'failed' ? 'all' : 'failed';
                setDocStatusTab(newTab);
              }}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            />
          )}
        </Stack>
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{ flex: 1, justifyContent: 'flex-end' }}
        >
          {docStatusTab === 'failed' && failed > 0 && (
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={handleRetryFailedDocs}
              sx={{ flexShrink: 0 }}
            >
              重试
            </Button>
          )}
          {selectedRowKeys.length > 0 && (
            <BatchEditCategoryButtons
              categoryEdit={categoryEdit}
              selectedRowKeys={getTopLevelSelectedIds()}
              onBatchEditComplete={() => setSelectedRowKeys([])}
              label="标签"
            />
          )}
          <TextField
            size="small"
            placeholder="搜索文档..."
            value={docStatusSearch}
            onChange={e => {
              setDocStatusSearch(e.target.value);
            }}
            sx={{ maxWidth: 300 }}
          />
        </Stack>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* 文档树形列表 */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
        {/* 表头 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1.5,
            mb: 1,
            bgcolor: 'background.default',
            borderRadius: 1,
            fontWeight: 500,
          }}
        >
          <Box sx={{ width: 40 }}>{/* 展开按钮列 */}</Box>
          <Box sx={{ width: 32 }}>{/* 文件夹图标列 */}</Box>
          <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
            文档名称
          </Typography>
          <Typography variant="body2" fontWeight={500} sx={{ minWidth: 120, mr: 2 }}>
            标签
          </Typography>
          <Typography variant="body2" fontWeight={500} sx={{ minWidth: 160 }}>
            更新时间
          </Typography>
        </Box>

        {/* 根节点列表 */}
        {rootNodes.map(doc => (
          <TreeNode key={doc.id} doc={doc} level={0} />
        ))}

        {/* 根节点加载更多 */}
        {rootHasMore && !rootLoading && rootNodes.length > 0 && (
          <Box sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
            <Button variant="outlined" onClick={() => loadRootNodes(rootPage + 1, true)}>
              加载更多
            </Button>
          </Box>
        )}

        {/* 根节点加载中 */}
        {rootLoading && (
          <Box
            sx={{ mt: 2, mb: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              加载中...
            </Typography>
          </Box>
        )}

        {/* 空状态 */}
        {!rootLoading && rootNodes.length === 0 && (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              暂无数据
            </Typography>
          </Box>
        )}
      </Box>

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
    </Card>
  );
};

export default KnowledgeBaseDetailPage;
