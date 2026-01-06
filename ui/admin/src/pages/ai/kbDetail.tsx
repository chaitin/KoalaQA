import {
  getAdminKbKbIdDocumentDocId,
  getAdminKbKbIdSpaceSpaceIdFolder,
  getAdminKbKbIdSpaceSpaceIdFolderFolderIdDoc,
  ModelDocStatus,
  ModelDocType,
  putAdminKbKbIdSpaceSpaceIdFolderFolderId,
  SvcDocListItem,
  SvcListSpaceFolderItem,
  TopicKBSpaceUpdateType,
} from '@/api';
import CategoryDisplay from '@/components/CategoryDisplay';
import CategoryItemSelector from '@/components/CategoryItemSelector';
import { BatchEditCategoryButtons } from '@/components/BatchEditCategoryButtons';
import { useCategoryEdit } from '@/hooks/useCategoryEdit';
import { Card, message, Modal, Table } from '@ctzhian/ui';
import { ColumnsType } from '@ctzhian/ui/dist/Table';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import { Box, Button, Chip, Divider, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFolderDocDataRef = useRef<any>(null);
  const searchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 使用分类编辑hook
  const categoryEdit = useCategoryEdit({
    kbId: kb_id || 0, // 使用默认值避免在无效时出错
    docType: ModelDocType.DocTypeSpace,
    onSuccess: () => {
      fetchFolderDocList();
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

  // 获取文件夹文档列表（分页）
  const {
    data: folderDocListData,
    run: fetchFolderDocList,
    loading: folderDocListLoading,
  } = useRequest(
    () => {
      if (!spaceId || !folderId || !kb_id) {
        return Promise.resolve(null);
      }
      const statusFilter = getStatusFilter();
      return getAdminKbKbIdSpaceSpaceIdFolderFolderIdDoc({
        kbId: kb_id,
        spaceId: spaceId,
        folderId: String(folderId),
        page: currentPage,
        size: pageSize,
        status: statusFilter,
        title: docStatusSearch.trim() || undefined,
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
          return;
        }
        lastFolderDocDataRef.current = response;
      },
    }
  );

  // 获取文件夹统计信息（使用文件夹列表接口，更轻量）
  const {
    data: folderListData,
    run: fetchStats,
  } = useRequest(
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

  const folderDocs: SvcDocListItem[] = folderDocListData?.items || [];
  const total = folderDocListData?.total || 0;

  // 从文件夹列表中获取当前文件夹的统计信息
  const currentFolder: SvcListSpaceFolderItem | undefined = folderListData?.items?.find(
    folder => folder.id === folderId
  );
  
  // 从文件夹数据中获取统计信息
  const success = currentFolder?.success || 0;
  const failed = currentFolder?.failed || 0;
  const totalDocs = currentFolder?.total || 0;
  const syncing = totalDocs - success - failed;

  // 启动轮询
  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = setInterval(() => {
      if (spaceId && folderId && kb_id) {
        fetchFolderDocList();
        fetchStats(); // 同时更新统计信息
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

  // 初始加载
  useEffect(() => {
    if (spaceId && folderId && kb_id) {
      fetchFolderDocList();
      fetchStats(); // 同时获取统计信息
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, folderId, kb_id]);

  // 当筛选条件变化时，重新获取数据（重置到第一页）
  useEffect(() => {
    if (spaceId && folderId && kb_id) {
      setCurrentPage(1);
      fetchFolderDocList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docStatusTab]);

  // 搜索条件变化时，使用防抖延迟请求
  useEffect(() => {
    if (spaceId && folderId && kb_id) {
      // 清除之前的定时器
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
      // 设置新的防抖定时器
      searchDebounceTimerRef.current = setTimeout(() => {
        setCurrentPage(1);
        fetchFolderDocList();
      }, 500); // 500ms 防抖
    }
    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docStatusSearch]);

  // 当分页参数变化时，重新获取数据
  useEffect(() => {
    if (spaceId && folderId && kb_id) {
      fetchFolderDocList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

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

  const handleRetryFailedDocs = async (docIds: number[]) => {
    if (!spaceId || !folderId || docIds.length === 0) return;

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
      fetchFolderDocList();
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


  // 搜索和筛选已通过 API 参数处理，直接使用返回的数据
  const docsAfterFilter = folderDocs;

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
      title: '文档名称',
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
                setCurrentPage(1);
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
                setCurrentPage(1);
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
                setCurrentPage(1);
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
              onClick={() =>
                handleRetryFailedDocs(
                  docsAfterFilter?.map(i => i?.id).filter((id): id is number => id !== undefined) ||
                    []
                )
              }
              sx={{ flexShrink: 0 }}
            >
              重试
            </Button>
          )}
          {selectedRowKeys.length > 0 && (
            <BatchEditCategoryButtons
              categoryEdit={categoryEdit}
              selectedRowKeys={selectedRowKeys}
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

      {/* 文档列表表格 */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={docsAfterFilter.map((doc, index) => ({
            ...doc,
            _rowKey: doc.id || doc.doc_id || `row-${index}`,
          }))}
          rowKey="_rowKey"
          pagination={{
            page: currentPage,
            pageSize: pageSize,
            total: total,
            onChange: (page: number, size: number) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
        />
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
