import { useState, useCallback, useEffect } from 'react';
import { useGroupData } from '@/context/GroupDataContext';

/**
 * 分类选择相关的hook
 * 用于管理分类选择的状态和逻辑
 */
export const useCategorySelection = () => {
  const { groups, loading } = useGroupData();
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);

  // 根据group_ids初始化选中的items
  const initializeFromGroupIds = useCallback((groupIds: number[]) => {
    if (loading || groups.length === 0) {
      // 如果groups还没加载完成，先设置groupIds，等加载完成后再通过useEffect初始化items
      setSelectedGroupIds(groupIds);
      setSelectedItemIds([]);
      return;
    }
    
    const itemIds: number[] = [];
    groups.forEach(group => {
      if (groupIds.includes(group.id || 0)) {
        group.items?.forEach(groupItem => {
          if (groupItem.id) {
            itemIds.push(groupItem.id);
          }
        });
      }
    });
    setSelectedItemIds(itemIds);
    setSelectedGroupIds(groupIds);
  }, [groups, loading]);

  // 当groups加载完成后，如果有groupIds但没有itemIds，则初始化items
  // 这个useEffect主要用于处理groups延迟加载的情况
  useEffect(() => {
    if (!loading && groups.length > 0 && selectedGroupIds.length > 0 && selectedItemIds.length === 0) {
      const itemIds: number[] = [];
      groups.forEach(group => {
        if (selectedGroupIds.includes(group.id || 0)) {
          group.items?.forEach(groupItem => {
            if (groupItem.id) {
              itemIds.push(groupItem.id);
            }
          });
        }
      });
      if (itemIds.length > 0) {
        setSelectedItemIds(itemIds);
      }
    }
  }, [loading, groups, selectedGroupIds]);

  // 处理item选择变化
  const handleItemToggle = useCallback((itemId: number) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      const selectedItemIdsArray = Array.from(newSet);
      
      // 根据选中的 items 更新 group_ids（包含该 item 的 group）
      const selectedGroupIdsSet = new Set<number>();
      groups.forEach(group => {
        const hasSelectedItem = group.items?.some(item => selectedItemIdsArray.includes(item.id || 0));
        if (hasSelectedItem) {
          selectedGroupIdsSet.add(group.id || 0);
        }
      });
      
      const newGroupIds = Array.from(selectedGroupIdsSet);
      setSelectedGroupIds(newGroupIds);
      return selectedItemIdsArray;
    });
  }, [groups]);

  // 重置选择
  const reset = useCallback(() => {
    setSelectedItemIds([]);
    setSelectedGroupIds([]);
  }, []);

  return {
    selectedItemIds,
    selectedGroupIds,
    initializeFromGroupIds,
    handleItemToggle,
    reset,
    setSelectedItemIds,
    setSelectedGroupIds,
  };
};

