import { useState } from 'react';
import { message, Modal, Table } from '@ctzhian/ui';
import { ColumnsType } from '@ctzhian/ui/dist/Table';
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
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import {
  ModelDocStatus,
  SvcDocListItem,
  SvcListSpaceFolderItem,
  getAdminKbKbIdDocumentDocId,
} from '@/api';
import CategoryDisplay from '@/components/CategoryDisplay';
import { formatDate } from '../utils';

interface DocStatusModalProps {
  open: boolean;
  onClose: () => void;
  folder: SvcListSpaceFolderItem | null;
  folderDocs: SvcDocListItem[];
  kbId: number;
  onRetryFailedDocs: (docIds: number[]) => void;
  onEditCategory: (item: SvcDocListItem) => void;
}

export const DocStatusModal = ({
  open,
  onClose,
  folder,
  folderDocs,
  kbId,
  onRetryFailedDocs,
  onEditCategory,
}: DocStatusModalProps) => {
  const [docStatusSearch, setDocStatusSearch] = useState('');
  const [docStatusTab, setDocStatusTab] = useState<'all' | 'success' | 'failed'>('all');
  const [docFailReasonById, setDocFailReasonById] = useState<Record<number, string>>({});
  const [docFailReasonLoadingById, setDocFailReasonLoadingById] = useState<
    Record<number, boolean>
  >({});

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
      const detail = await getAdminKbKbIdDocumentDocId({ kbId, docId });
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
            : [ModelDocStatus.DocStatusApplyFailed, ModelDocStatus.DocStatusExportFailed].includes(
                d.status!
              );
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
            onClick={() => onEditCategory(record)}
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

  const handleClose = () => {
    setDocStatusSearch('');
    setDocStatusTab('all');
    setDocFailReasonById({});
    setDocFailReasonLoadingById({});
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      onOk={handleClose}
      okText="关闭"
      cancelText="取消"
      title="查看知识库"
      width={900}
    >
      <Stack spacing={2}>
        <Stack spacing={1} direction="row" alignItems="center">
          <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
            {folder?.title || '文档'}
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
                  onRetryFailedDocs(
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
          dataSource={docsAfterFilter.map((doc, index) => ({
            ...doc,
            _rowKey: doc.id || doc.doc_id || `row-${index}`,
          }))}
          rowKey="_rowKey"
          pagination={false}
          loading={false}
        />
      </Stack>
    </Modal>
  );
};

