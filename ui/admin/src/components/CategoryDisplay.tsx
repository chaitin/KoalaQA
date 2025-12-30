import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Chip, IconButton, Stack, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useGroupData } from '@/context/GroupDataContext';

export interface CategoryDisplayProps {
  /** item_ids数组（注意：后端返回的group_ids字段实际存储的是item_ids） */
  itemIds: number[];
  /** 点击分类时的回调 */
  onClick?: () => void;
}

/**
 * 分类显示组件
 * 用于在列表中显示分类，直接显示传入的item_ids对应的子项名称
 */
const CategoryDisplay: React.FC<CategoryDisplayProps> = ({ itemIds, onClick }) => {
  const { groups } = useGroupData();
  const containerRef = useRef<HTMLDivElement>(null);

  // 根据item_ids获取对应的items信息
  const items = useMemo(() => {
    const result: Array<{ id: number; name: string }> = [];
    groups.forEach(group => {
      group.items?.forEach(item => {
        if (item.id && itemIds.includes(item.id)) {
          result.push({
            id: item.id,
            name: item.name || '',
          });
        }
      });
    });
    return result;
  }, [groups, itemIds]);

  const [visibleCount, setVisibleCount] = useState<number>(items.length);

  // 计算可见的标签数量
  useEffect(() => {
    const calculateVisibleCount = () => {
      if (!containerRef.current || items.length === 0) {
        setVisibleCount(items.length);
        return;
      }

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const availableWidth = containerRect.width;
      
      // 添加按钮的宽度（虚线边框的 + 按钮）
      const addButtonWidth = 32; // 大约32px
      // +N 按钮的宽度（如果有剩余项）
      const moreButtonWidth = 40; // 大约40px
      
      let usedWidth = addButtonWidth;
      let count = 0;
      
      // 临时创建元素来测量每个标签的宽度
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.visibility = 'hidden';
      tempContainer.style.whiteSpace = 'nowrap';
      document.body.appendChild(tempContainer);
      
      for (let i = 0; i < items.length; i++) {
        const tempChip = document.createElement('div');
        tempChip.style.display = 'inline-block';
        tempChip.style.height = '24px';
        tempChip.style.fontSize = '12px';
        tempChip.style.padding = '0 8px';
        tempChip.style.borderRadius = '8px';
        tempChip.style.maxWidth = '200px';
        tempChip.style.overflow = 'hidden';
        tempChip.style.textOverflow = 'ellipsis';
        tempChip.style.whiteSpace = 'nowrap';
        tempChip.textContent = items[i].name;
        tempContainer.appendChild(tempChip);
        
        const chipWidth = tempChip.offsetWidth;
        const spacing = i > 0 ? 4 : 0; // gap: 0.5 = 4px
        
        // 如果有剩余项，需要预留 +N 按钮的空间
        const needMoreButton = i < items.length - 1;
        const requiredWidth = usedWidth + spacing + chipWidth + (needMoreButton ? moreButtonWidth : 0);
        
        if (requiredWidth <= availableWidth) {
          usedWidth += spacing + chipWidth;
          count++;
        } else {
          break;
        }
      }
      
      tempContainer.remove();
      setVisibleCount(count);
    };

    calculateVisibleCount();
    
    const resizeObserver = new ResizeObserver(() => {
      calculateVisibleCount();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [items]);

  const visibleItems = items.slice(0, visibleCount);
  const remainingCount = items.length - visibleCount;

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" spacing={0.5} gap={0.5} sx={{ overflow: 'hidden', flexWrap: 'nowrap' }}>
        {visibleItems.map(item => (
          <Chip
            key={item.id}
            label={item.name}
            size="small"
            sx={{
              height: 24,
              fontSize: 12,
              borderRadius: '8px',
              maxWidth: '200px',
              flexShrink: 0,
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              },
            }}
            onClick={onClick}
          />
        ))}
        {remainingCount > 0 && (
          <Chip
            label={`+${remainingCount}`}
            size="small"
            sx={{
              height: 24,
              fontSize: 12,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              flexShrink: 0,
            }}
            onClick={onClick}
          />
        )}
        <IconButton
          size="small"
          onClick={onClick}
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: '2px',
            py: 0,
            px: 0.3,
            flexShrink: 0,
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
};

export default CategoryDisplay;
