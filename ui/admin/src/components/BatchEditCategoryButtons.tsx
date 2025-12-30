import { Button } from '@mui/material';
import { Modal } from '@ctzhian/ui';
import CategoryItemSelector from './CategoryItemSelector';
import { useCategoryEdit } from '@/hooks/useCategoryEdit';
import { useCallback } from 'react';

interface BatchEditCategoryButtonsProps {
  categoryEdit: ReturnType<typeof useCategoryEdit>;
  selectedRowKeys: React.Key[];
  onBatchEditComplete?: () => void;
  label?: string; // 标签文案，默认为"标签"
}

/**
 * 批量编辑标签按钮和弹窗组件
 * 提供统一的批量编辑标签功能
 */
export const BatchEditCategoryButtons = ({
  categoryEdit,
  selectedRowKeys,
  onBatchEditComplete,
  label = '标签',
}: BatchEditCategoryButtonsProps) => {
  const handleBatchEditCategory = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      return;
    }
    categoryEdit.handleBatchEditCategory(selectedRowKeys);
  }, [selectedRowKeys, categoryEdit]);

  const handleConfirmBatchEditCategory = useCallback(async () => {
    await categoryEdit.handleConfirmBatchEditCategory(selectedRowKeys);
    onBatchEditComplete?.();
  }, [selectedRowKeys, categoryEdit, onBatchEditComplete]);

  const handleChange = useCallback(
    (itemIds: number[], groupIds: number[]) => {
      categoryEdit.batchCategorySelection.setSelectedItemIds(itemIds);
      categoryEdit.batchCategorySelection.setSelectedGroupIds(groupIds);
    },
    [categoryEdit.batchCategorySelection]
  );

  if (selectedRowKeys.length === 0) {
    return null;
  }

  return (
    <>
      <Button variant="text" size="small" color="primary" onClick={handleBatchEditCategory}>
        批量编辑{label} ({selectedRowKeys.length})
      </Button>
      {/* 批量编辑标签弹窗 */}
      <Modal
        open={categoryEdit.batchEditModalOpen}
        onCancel={categoryEdit.handleCloseBatchEditModal}
        title={`批量编辑${label}`}
        onOk={handleConfirmBatchEditCategory}
      >
        <CategoryItemSelector
          key={categoryEdit.batchEditModalOpen ? 'batch-edit' : 'closed'}
          selectedItemIds={categoryEdit.batchCategorySelection.selectedItemIds}
          onChange={handleChange}
          showSelectedCount
          selectedCount={selectedRowKeys.length}
        />
      </Modal>
    </>
  );
};

