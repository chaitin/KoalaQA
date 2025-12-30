import { useState, useCallback } from 'react';
import { message } from '@ctzhian/ui';
import { putAdminKbKbIdDocumentGroupIds, ModelDocType, SvcDocListItem } from '@/api';
import { useCategorySelection } from './useCategorySelection';
import { useGroupData } from '@/context/GroupDataContext';

interface UseCategoryEditOptions {
  kbId: number;
  docType: ModelDocType;
  onSuccess?: () => void;
}

/**
 * 分类编辑相关的hook
 * 用于管理批量编辑和单个编辑分类的状态和逻辑
 */
export const useCategoryEdit = ({ kbId, docType, onSuccess }: UseCategoryEditOptions) => {
  const { groups } = useGroupData();
  
  // 批量编辑的状态
  const [batchEditModalOpen, setBatchEditModalOpen] = useState(false);
  const batchCategorySelection = useCategorySelection();
  
  // 单个编辑的状态
  const [editingCategoryItem, setEditingCategoryItem] = useState<SvcDocListItem | null>(null);
  const editCategorySelection = useCategorySelection();

  // 批量编辑分类
  const handleBatchEditCategory = useCallback((selectedRowKeys: React.Key[]) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要编辑的项目');
      return;
    }
    batchCategorySelection.reset();
    setBatchEditModalOpen(true);
  }, [batchCategorySelection]);

  // 确认批量编辑分类
  const handleConfirmBatchEditCategory = useCallback(async (selectedRowKeys: React.Key[]) => {
    if (selectedRowKeys.length === 0) return;
    try {
      await putAdminKbKbIdDocumentGroupIds(
        { kbId },
        {
          ids: selectedRowKeys.map(Number),
          type: docType,
          group_ids: batchCategorySelection.selectedItemIds,
        }
      );
      message.success('批量编辑分类成功');
      setBatchEditModalOpen(false);
      batchCategorySelection.reset();
      onSuccess?.();
    } catch {
      message.error('批量编辑分类失败');
    }
  }, [kbId, docType, batchCategorySelection, onSuccess]);

  // 关闭批量编辑弹窗
  const handleCloseBatchEditModal = useCallback(() => {
    setBatchEditModalOpen(false);
    batchCategorySelection.reset();
  }, [batchCategorySelection]);

  // 编辑单个项目的分类
  const handleEditCategory = useCallback((item: SvcDocListItem) => {
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
  }, [editCategorySelection, groups]);

  // 确认编辑单个项目的分类
  const handleConfirmEditCategory = useCallback(async () => {
    if (!editingCategoryItem) return;
    try {
      // 注意：API需要的是group_ids，但实际存储的是item_ids
      // 所以我们需要提交item_ids，但字段名仍然是group_ids
      await putAdminKbKbIdDocumentGroupIds(
        { kbId },
        {
          ids: [editingCategoryItem.id!],
          type: docType,
          // 后端实际存储的是item_ids，所以直接提交item_ids
          group_ids: editCategorySelection.selectedItemIds,
        }
      );
      message.success('编辑分类成功');
      setEditingCategoryItem(null);
      editCategorySelection.reset();
      onSuccess?.();
    } catch {
      message.error('编辑分类失败');
    }
  }, [kbId, docType, editingCategoryItem, editCategorySelection, onSuccess]);

  // 关闭单个编辑弹窗
  const handleCloseEditModal = useCallback(() => {
    setEditingCategoryItem(null);
    editCategorySelection.reset();
  }, [editCategorySelection]);

  return {
    // 批量编辑相关
    batchEditModalOpen,
    batchCategorySelection,
    handleBatchEditCategory,
    handleConfirmBatchEditCategory,
    handleCloseBatchEditModal,
    
    // 单个编辑相关
    editingCategoryItem,
    editCategorySelection,
    handleEditCategory,
    handleConfirmEditCategory,
    handleCloseEditModal,
  };
};

