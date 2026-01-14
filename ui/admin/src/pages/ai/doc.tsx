import {
  deleteAdminKbKbIdDocumentDocId,
  getAdminKbKbIdDocument,
  getAdminKbKbIdDocumentDocId,
  ModelDocType,
  ModelFileType,
  ModelKBDocumentDetail,
  SvcDocListItem,
} from '@/api';
import { BatchEditCategoryButtons } from '@/components/BatchEditCategoryButtons';
import CategoryDisplay from '@/components/CategoryDisplay';
import CategoryItemSelector from '@/components/CategoryItemSelector';
import EditorContent from '@/components/EditorContent';
import { fileType } from '@/components/ImportDoc/const';
import LoadingBtn from '@/components/LoadingButton';
import StatusBadge from '@/components/StatusBadge';
import { useCategoryEdit } from '@/hooks/useCategoryEdit';
import { useListQueryParams } from '@/hooks/useListQueryParams';
import { Ellipsis, message, Modal, Table } from '@ctzhian/ui';
import { ColumnsType } from '@ctzhian/ui/dist/Table';
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
import DocImport from './docImport';

// 新增：用于请求 markdown 内容
const fetchMarkdownContent = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('请求 markdown 内容失败');
    return await res.text();
  } catch {
    return '加载内容失败';
  }
};

const AdminDocument = () => {
  const { query, page, size, setParams, setSearch } = useListQueryParams();
  const [searchParams] = useSearchParams();
  const kb_id = +searchParams.get('id')!;
  const [title, setTitle] = useState(query.title);
  const [file_type, setFile_type] = useState<ModelFileType | ''>(() => {
    if (query.file_type === undefined || query.file_type === '') return '';
    return Number(query.file_type) as ModelFileType;
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const {
    data,
    loading,
    run: fetchData,
    mutate,
  } = useRequest(params => getAdminKbKbIdDocument({ ...params, kbId: kb_id }), { manual: true });
  
  // 使用分类编辑hook
  const categoryEdit = useCategoryEdit({
    kbId: kb_id,
    docType: ModelDocType.DocTypeDocument,
    onSuccess: (updatedIds, newGroupIds) => {
      // 直接更新本地数据，不重新请求
      if (data?.items) {
        const newItems = data.items.map(item => {
          if (updatedIds.includes(item.id!)) {
            return { ...item, group_ids: newGroupIds };
          }
          return item;
        });
        mutate({ ...data, items: newItems });
      }
    },
  });
  const [detail, setDetail] = useState<ModelKBDocumentDetail | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>('');

  const viewDetail = async (item: SvcDocListItem) => {
    const docDetail = await getAdminKbKbIdDocumentDocId({ kbId: kb_id, docId: item.id! });
    setDetail(docDetail);
    // 如果 markdown 字段是 url，则请求内容
    if (docDetail?.markdown && /^https?:\/\//.test(docDetail.markdown)) {
      setMarkdownContent('加载中...');
      const content = await fetchMarkdownContent(docDetail.markdown);
      setMarkdownContent(content);
    } else {
      setMarkdownContent(docDetail?.markdown || '');
    }
  };
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
        deleteAdminKbKbIdDocumentDocId({ kbId: kb_id, docId: item.id! }).then(() => {
          message.success('删除成功');
          // 直接刷新当前页数据，而不是设置页码（避免当前已在第1页时无法触发刷新）
          const _query = { ...query };
          delete _query.name;
          fetchData(_query);
        });
      },
    });
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
            deleteAdminKbKbIdDocumentDocId({ kbId: kb_id, docId: Number(key) })
          )
        )
          .then(() => {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            // 直接刷新当前页数据，而不是设置页码（避免当前已在第1页时无法触发刷新）
            const _query = { ...query };
            delete _query.name;
            fetchData(_query);
          })
          .catch(() => {
            message.error('批量删除失败');
          });
      },
    });
  };

  // 编辑单个项目的分类
  const handleEditCategory = (item: SvcDocListItem) => {
    categoryEdit.handleEditCategory(item);
  };

  // 确认编辑单个项目的分类
  const handleConfirmEditCategory = async () => {
    await categoryEdit.handleConfirmEditCategory();
  };

  const columns: ColumnsType<SvcDocListItem> = [
    {
      title: '标题',
      dataIndex: 'title',
      render: (_, record) => {
        return <Ellipsis>{record?.title || '-'}</Ellipsis>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (_, record) => {
        if (!record?.status) return '-';
        return <StatusBadge status={record.status} />;
      },
    },
    {
      title: '类型',
      dataIndex: 'file_type',
      render: (_, record) => {
        if (!record?.file_type) return '-';
        return fileType[record.file_type as keyof typeof fileType] || record.file_type;
      },
    },
    {
      title: '分类',
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
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <LoadingBtn
              variant="text"
              size="small"
              color="primary"
              onClick={() => viewDetail(record)}
            >
              查看
            </LoadingBtn>
            <Button variant="text" size="small" color="error" onClick={() => deleteDoc(record)}>
              删除
            </Button>
          </Stack>
        );
      },
    },
  ];

  useEffect(() => {
    const _query = { ...query };
    delete _query.name;
    fetchData(_query);
  }, [query, fetchData]);

  return (
    <Stack sx={{ height: '100%', pt: 0 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="caption">共 {data?.total} 个文档</Typography>
          <TextField
            label="标题"
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
            <InputLabel>类型</InputLabel>
            <Select
              value={file_type}
              label="类型"
              onChange={e => {
                const value = e.target.value as ModelFileType | '';
                setFile_type(value);
                setSearch({
                  file_type: value || undefined,
                });
              }}
            >
              <MenuItem value="">
                <em>全部</em>
              </MenuItem>
              {Object.entries(fileType).map(([key, label]) => (
                <MenuItem key={key} value={Number(key)}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        {selectedRowKeys.length > 0 ? (
          <Stack direction="row" alignItems="center" spacing={1}>
            <BatchEditCategoryButtons
              categoryEdit={categoryEdit}
              selectedRowKeys={selectedRowKeys}
              onBatchEditComplete={() => setSelectedRowKeys([])}
              label="分类"
            />
            <Button variant="text" size="small" color="error" onClick={handleBatchDelete}>
              批量删除 ({selectedRowKeys.length})
            </Button>
          </Stack>
        ) : (
          <DocImport refresh={fetchData} allowedImportTypes={['OfflineFile']} />
        )}
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
      <Modal
        open={!!detail}
        title={detail?.title || '文档详情'}
        onCancel={() => setDetail(null)}
        footer={
          <Button variant="text" onClick={() => setDetail(null)}>
            关闭
          </Button>
        }
      >
        <Box sx={{ maxHeight: 600, overflow: 'auto', pr: 1, width: '100%' }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {detail?.title || '-'}
          </Typography>

          {detail ? (
            <EditorContent content={markdownContent || '未查询到回答内容'} />
          ) : (
            <Typography sx={{ color: 'text.secondary' }}>无可显示内容</Typography>
          )}
        </Box>
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
            // 使用函数式更新确保状态正确更新
            categoryEdit.editCategorySelection.setSelectedItemIds(itemIds);
            categoryEdit.editCategorySelection.setSelectedGroupIds(groupIds);
          }}
        />
      </Modal>
    </Stack>
  );
};

export default AdminDocument;
