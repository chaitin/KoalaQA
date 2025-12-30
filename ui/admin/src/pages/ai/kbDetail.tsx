import {
  getAdminKbKbIdDocumentDocId,
  getAdminKbKbIdSpaceSpaceIdFolderFolderIdDoc,
  ModelDocStatus,
  ModelDocType,
  putAdminKbKbIdSpaceSpaceIdFolderFolderId,
  SvcDocListItem,
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
import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
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
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFolderDocDataRef = useRef<any>(null);

  // 使用分类编辑hook
  const categoryEdit = useCategoryEdit({
    kbId: kb_id || 0, // 使用默认值避免在无效时出错
    docType: ModelDocType.DocTypeSpace,
    onSuccess: () => {
      fetchFolderDocList();
    },
  });

  // 获取文件夹文档列表
  const {
    data: folderDocListData,
    run: fetchFolderDocList,
    loading: folderDocListLoading,
  } = useRequest(
    () => {
      if (!spaceId || !folderId || !kb_id) {
        return Promise.resolve(null);
      }
      return getAdminKbKbIdSpaceSpaceIdFolderFolderIdDoc({
        kbId: kb_id,
        spaceId: spaceId,
        folderId: String(folderId),
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
          return;
        }
        lastFolderDocDataRef.current = response;
      },
    }
  );

  const folderDocs: SvcDocListItem[] = folderDocListData?.items || [];

  // 启动轮询
  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = setInterval(() => {
      if (spaceId && folderId && kb_id) {
        fetchFolderDocList();
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

  // 检查是否有同步中的文档
  useEffect(() => {
    if (!kb_id) return;
    const hasSyncing = folderDocs.some(
      doc =>
        doc.status !== ModelDocStatus.DocStatusApplySuccess &&
        doc.status !== ModelDocStatus.DocStatusApplyFailed &&
        doc.status !== ModelDocStatus.DocStatusExportFailed
    );
    if (hasSyncing) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderDocs.length, folderDocListData, kb_id]);

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, folderId, kb_id]);

  // 如果 kb_id 无效，返回错误提示（在所有 Hooks 调用之后）
  if (!kb_id || kb_id <= 0 || Number.isNaN(kb_id)) {
    return (
      <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
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

  // 根据 folderDocs 计算成功、失败和同步中的数量
  const success = folderDocs.filter(
    d => d.status === ModelDocStatus.DocStatusApplySuccess
  ).length;
  const failed = folderDocs.filter(
    d =>
      d.status === ModelDocStatus.DocStatusApplyFailed ||
      d.status === ModelDocStatus.DocStatusExportFailed
  ).length;
  const syncing = folderDocs.filter(
    d =>
      d.status !== ModelDocStatus.DocStatusApplySuccess &&
      d.status !== ModelDocStatus.DocStatusApplyFailed &&
      d.status !== ModelDocStatus.DocStatusExportFailed
  ).length;

  const q = docStatusSearch.trim().toLowerCase();
  const docsAfterSearch = folderDocs.filter(d => (d.title || '').toLowerCase().includes(q));
  const docsAfterFilter =
    docStatusTab === 'all'
      ? docsAfterSearch
      : docsAfterSearch.filter(d => {
          if (docStatusTab === 'success') {
            return ModelDocStatus.DocStatusApplySuccess === d.status;
          }
          if (docStatusTab === 'failed') {
            return [
              ModelDocStatus.DocStatusApplyFailed,
              ModelDocStatus.DocStatusExportFailed,
            ].includes(d.status!);
          }
          if (docStatusTab === 'syncing') {
            return (
              d.status !== ModelDocStatus.DocStatusApplySuccess &&
              d.status !== ModelDocStatus.DocStatusApplyFailed &&
              d.status !== ModelDocStatus.DocStatusExportFailed
            );
          }
          return true;
        });

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
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          {success > 0 && (
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
          )}
          {syncing > 0 && (
            <Chip
              size="small"
              color="warning"
              variant={docStatusTab === 'syncing' ? 'filled' : 'outlined'}
              label={`同步中: ${syncing}`}
              onClick={() => setDocStatusTab(docStatusTab === 'syncing' ? 'all' : 'syncing')}
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
            >
              重试
            </Button>
          )}
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1, justifyContent: 'flex-end' }}>
          <TextField
            size="small"
            placeholder="搜索文档..."
            value={docStatusSearch}
            onChange={e => setDocStatusSearch(e.target.value)}
            sx={{ maxWidth: 300 }}
          />
          {selectedRowKeys.length > 0 && (
            <BatchEditCategoryButtons
              categoryEdit={categoryEdit}
              selectedRowKeys={selectedRowKeys}
              onBatchEditComplete={() => setSelectedRowKeys([])}
              label="标签"
            />
          )}
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
          pagination={false}
          loading={folderDocListLoading}
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

