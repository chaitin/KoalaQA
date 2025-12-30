import React from 'react';
import { Box, Checkbox, Stack, Typography } from '@mui/material';
import { useGroupData } from '@/context/GroupDataContext';

export interface CategoryItemSelectorProps {
  /** 选中的item ids */
  selectedItemIds: number[];
  /** 选择变化回调 */
  onChange: (itemIds: number[], groupIds: number[]) => void;
  /** 是否显示已选择数量提示 */
  showSelectedCount?: boolean;
  /** 已选择的数量（用于显示提示） */
  selectedCount?: number;
}

/**
 * 分类子项选择器组件
 * 用于在弹窗中选择分类的子项
 */
const CategoryItemSelector: React.FC<CategoryItemSelectorProps> = ({
  selectedItemIds,
  onChange,
  showSelectedCount = false,
  selectedCount = 0,
}) => {
  const { groups, loading: groupsLoading } = useGroupData();

  // 处理item选择变化
  const handleItemToggle = (itemId: number) => {
    const newSet = new Set(selectedItemIds);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    const selectedItemIdsArray = Array.from(newSet);
    
    // 根据选中的 items 更新 group_ids（包含该 item 的 group）
    const selectedGroupIds = new Set<number>();
    groups.forEach(group => {
      const hasSelectedItem = group.items?.some(item => selectedItemIdsArray.includes(item.id || 0));
      if (hasSelectedItem) {
        selectedGroupIds.add(group.id || 0);
      }
    });
    
    onChange(selectedItemIdsArray, Array.from(selectedGroupIds));
  };

  return (
    <Stack spacing={2} sx={{ mt: 2, maxHeight: 400, overflow: 'auto' }}>
      {groupsLoading ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
          加载中...
        </Typography>
      ) : groups.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
          暂无分类数据，请先在分类管理中创建分类
        </Typography>
      ) : (
        groups.map(group => {
          const groupItems = group.items || [];
          
          return (
            <Box key={group.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, px: 1 }}>
                {group.name}
              </Typography>
              {groupItems.length === 0 ? (
                <Typography variant="caption" sx={{ color: 'text.secondary', px: 2, py: 1, display: 'block' }}>
                  该分类下暂无子项
                </Typography>
              ) : (
                <Box sx={{ pl: 1 }}>
                  {groupItems.map(item => (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        py: 0.5,
                        px: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                        cursor: 'pointer',
                      }}
                      onClick={() => handleItemToggle(item.id || 0)}
                    >
                      <Checkbox
                        checked={selectedItemIds.includes(item.id || 0)}
                        size="small"
                        onChange={() => handleItemToggle(item.id || 0)}
                        onClick={e => e.stopPropagation()}
                      />
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {item.name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          );
        })
      )}
      {showSelectedCount && selectedCount > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          已选择 {selectedCount} 个项目
        </Typography>
      )}
    </Stack>
  );
};

export default CategoryItemSelector;

