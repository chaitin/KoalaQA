import {
  deleteAdminKbKbIdQuestionQaId,
  getAdminKbKbIdQuestion,
  getAdminKbKbIdQuestionQaId,
  ModelDocStatus,
  ModelDocType,
  ModelKBDocumentDetail,
  putAdminKbKbIdDocumentGroupIds,
  SvcDocListItem,
} from '@/api';
import Card from '@/components/card';
import StatusBadge from '@/components/StatusBadge';
import CategoryDisplay from '@/components/CategoryDisplay';
import CategoryItemSelector from '@/components/CategoryItemSelector';
import { useListQueryParams } from '@/hooks/useListQueryParams';
import { Ellipsis, message, Modal, Table } from '@ctzhian/ui';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QaImport from './qaImport';
import LoadingBtn from '@/components/LoadingButton';
import { ColumnsType } from '@ctzhian/ui/dist/Table';
import { useCategorySelection } from '@/hooks/useCategorySelection';
import { useGroupData } from '@/context/GroupDataContext';

const AdminDocument = () => {
  const { query, page, size, setParams, setSearch } = useListQueryParams();
  const [searchParams] = useSearchParams();
  const kb_id = +searchParams.get('id')!;
  const [title, setTitle] = useState(query.title);
  const [editItem, setEditItem] = useState<ModelKBDocumentDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<ModelDocStatus | ''>(() => {
    if (query.status === undefined || query.status === '') return '';
    return Number(query.status) as ModelDocStatus;
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchEditModalOpen, setBatchEditModalOpen] = useState(false);
  const [editingCategoryItem, setEditingCategoryItem] = useState<SvcDocListItem | null>(null);
  
  // 批量编辑分类的状态
  const batchCategorySelection = useCategorySelection();
  
  // 单个编辑分类的状态
  const editCategorySelection = useCategorySelection();
  
  // 获取groups数据（用于计算group_ids）
  const { groups } = useGroupData();
  
  const statusOptions = [
    { value: ModelDocStatus.DocStatusPendingReview, label: '待审核' },
    { value: ModelDocStatus.DocStatusApplySuccess, label: '应用中' },
    { value: ModelDocStatus.DocStatusApplyFailed, label: '应用失败' },
  ];

  const {
    data,
    loading,
    run: fetchData,
  } = useRequest(params => getAdminKbKbIdQuestion({ page, size, ...params, kbId: kb_id }), {
    manual: true,
  });
  const deleteDoc = (item: SvcDocListItem) => {
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
            {item!.title}
          </Box>{' '}
          吗？
        </>
      ),
      onOk: () => {
        deleteAdminKbKbIdQuestionQaId({ kbId: kb_id, qaId: item.id! }).then(() => {
          message.success('删除成功');
          fetchData({
            page: 1,
          });
        });
      },
    });
  };

  const { runAsync: fetchDetail } = useRequest(
    (qaId: number) => getAdminKbKbIdQuestionQaId({ kbId: kb_id, qaId }),
    {
      manual: true,
      onSuccess: res => {
        // 兼容 API 可能返回 {data: {...}} 或直接返回详情
        const detail = (res as any)?.data ?? res;
        setEditItem(detail as ModelKBDocumentDetail);
      },
    }
  );

  // 批量编辑分类
  const handleBatchEditCategory = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要编辑的项目');
      return;
    }
    batchCategorySelection.reset();
    setBatchEditModalOpen(true);
  };

  // 确认批量编辑分类
  const handleConfirmBatchEditCategory = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      await putAdminKbKbIdDocumentGroupIds(
        { kbId: kb_id },
        {
          ids: selectedRowKeys.map(Number),
          type: ModelDocType.DocTypeQuestion,
          group_ids: batchCategorySelection.selectedGroupIds,
        }
      );
      message.success('批量编辑分类成功');
      setBatchEditModalOpen(false);
      batchCategorySelection.reset();
      setSelectedRowKeys([]);
      fetchData({
        page: 1,
      });
    } catch {
      message.error('批量编辑分类失败');
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的项目');
      return;
    }
    Modal.confirm({
      title: '提示',
      okText: '删除',
      okButtonProps: {
        color: 'error',
      },
      content: `确定要删除选中的 ${selectedRowKeys.length} 个项目吗？`,
      onOk: () => {
        Promise.all(
          selectedRowKeys.map(key =>
            deleteAdminKbKbIdQuestionQaId({ kbId: kb_id, qaId: Number(key) })
          )
        )
          .then(() => {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            fetchData({
              page: 1,
            });
          })
          .catch(() => {
            message.error('批量删除失败');
          });
      },
    });
  };

  // 编辑单个项目的分类
  const handleEditCategory = (item: SvcDocListItem) => {
    setEditingCategoryItem(item);
    // 注意：后端返回的group_ids字段实际存储的是item_ids（子类id）
    // 直接使用这些id作为选中的item_ids
    const itemIds = item.group_ids || [];
    editCategorySelection.setSelectedItemIds(itemIds);
    // 根据选中的items计算对应的group_ids（用于提交到API）
    const selectedGroupIds = new Set<number>();
    groups.forEach(group => {
      const hasSelectedItem = group.items?.some(groupItem => itemIds.includes(groupItem.id || 0));
      if (hasSelectedItem) {
        selectedGroupIds.add(group.id || 0);
      }
    });
    editCategorySelection.setSelectedGroupIds(Array.from(selectedGroupIds));
  };

  // 确认编辑单个项目的分类
  const handleConfirmEditCategory = async () => {
    if (!editingCategoryItem) return;
    try {
      // 注意：API需要的是group_ids，但实际存储的是item_ids
      // 所以我们需要提交item_ids，但字段名仍然是group_ids
      await putAdminKbKbIdDocumentGroupIds(
        { kbId: kb_id },
        {
          ids: [editingCategoryItem.id!],
          type: ModelDocType.DocTypeQuestion,
          // 后端实际存储的是item_ids，所以直接提交item_ids
          group_ids: editCategorySelection.selectedItemIds,
        }
      );
      message.success('编辑分类成功');
      setEditingCategoryItem(null);
      editCategorySelection.reset();
      fetchData({
        page: 1,
      });
    } catch {
      message.error('编辑分类失败');
    }
  };

  const columns: ColumnsType<SvcDocListItem> = [
    {
      title: '问题',
      dataIndex: 'title',
      render: (_, record) => {
        return <Ellipsis sx={{ fontSize: 14 }}>{record?.title || '-'}</Ellipsis>;
      },
    },
    {
      title: '标签',
      dataIndex: 'group_ids',
      render: (_, record) => {
        // 注意：后端返回的group_ids字段实际存储的是item_ids（子类id）
        return (
          <CategoryDisplay
            itemIds={record.group_ids || []}
            onClick={() => handleEditCategory(record)}
          />
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (_, record) => {
        return (
          <StatusBadge
            status={record.status}
            onClick={() => {
              if (record.status === ModelDocStatus.DocStatusPendingReview) {
                fetchDetail(record.id!);
              }
            }}
          />
        );
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      // width: 120,
      render: (_, record) => {
        return dayjs((record?.updated_at || 0) * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      title: '',
      dataIndex: 'opt',
      // width: 120,
      render: (_, record) => {
        const isPendingReview = record?.status === ModelDocStatus.DocStatusPendingReview;
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            {isPendingReview ? (
              <>
                <LoadingBtn
                  variant="text"
                  size="small"
                  color="primary"
                  onClick={() => fetchDetail(record.id!)}
                >
                  查看
                </LoadingBtn>
                <Button variant="text" size="small" color="error" onClick={() => deleteDoc(record)}>
                  删除
                </Button>
              </>
            ) : (
              <>
                <LoadingBtn
                  variant="text"
                  size="small"
                  color="primary"
                  onClick={() => fetchDetail(record.id!)}
                >
                  编辑
                </LoadingBtn>
                <Button variant="text" size="small" color="error" onClick={() => deleteDoc(record)}>
                  删除
                </Button>
              </>
            )}
          </Stack>
        );
      },
    },
  ];

  useEffect(() => {
    const _query = { ...query };
    delete _query.name;
    fetchData(_query);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Stack component={Card} sx={{ height: '100%', pt: 0 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="caption">共 {data?.total || 0} 个问题</Typography>
          <TextField
            label="问题"
            value={title}
            size="small"
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setSearch({
                  title,
                });
              }
            }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>状态</InputLabel>
            <Select
              label="状态"
              value={statusFilter}
              onChange={e => {
                const value = e.target.value as ModelDocStatus | '';
                setStatusFilter(value);
                setSearch({
                  status: value || undefined,
                });
              }}
            >
              <MenuItem value="">全部</MenuItem>
              {statusOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedRowKeys.length > 0 && (
            <>
              <Button variant="contained" size="small" onClick={handleBatchEditCategory}>
                批量编辑分类 ({selectedRowKeys.length})
              </Button>
              <Button variant="contained" size="small" color="error" onClick={handleBatchDelete}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </>
          )}
        </Stack>
        <QaImport refresh={fetchData} setEditItem={setEditItem} editItem={editItem} />
      </Stack>
      <Table
        sx={{ mx: -2, flex: 1, height: '0' }}
        PaginationProps={{
          sx: {
            pt: 2,
            mx: 2,
          },
        }}
        loading={loading}
        columns={columns}
        dataSource={data?.items || []}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{
          page,
          pageSize: size,
          total: data?.total || 0,
          onChange: (page: number, size: number) => {
            setParams({
              page,
              size,
            });
          },
        }}
      />
      {/* 批量编辑分类弹窗 */}
      <Modal
        open={batchEditModalOpen}
        onCancel={() => {
          setBatchEditModalOpen(false);
          batchCategorySelection.reset();
        }}
        title="批量编辑分类"
        onOk={handleConfirmBatchEditCategory}
      >
        <CategoryItemSelector
          selectedItemIds={batchCategorySelection.selectedItemIds}
          onChange={(itemIds, groupIds) => {
            batchCategorySelection.setSelectedItemIds(itemIds);
            batchCategorySelection.setSelectedGroupIds(groupIds);
          }}
          showSelectedCount
          selectedCount={selectedRowKeys.length}
        />
      </Modal>
      {/* 编辑单个项目分类弹窗 */}
      <Modal
        open={!!editingCategoryItem}
        onCancel={() => {
          setEditingCategoryItem(null);
          editCategorySelection.reset();
        }}
        title="编辑分类"
        onOk={handleConfirmEditCategory}
      >
        <CategoryItemSelector
          selectedItemIds={editCategorySelection.selectedItemIds}
          onChange={(itemIds, groupIds) => {
            // 使用函数式更新确保状态正确更新
            editCategorySelection.setSelectedItemIds(itemIds);
            editCategorySelection.setSelectedGroupIds(groupIds);
          }}
        />
      </Modal>
    </Stack>
  );
};

export default AdminDocument;
