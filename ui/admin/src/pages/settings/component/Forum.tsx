import React, { useState, useCallback, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import {
  Box,
  Button,
  Stack,
  Typography,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon, message } from '@ctzhian/ui';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Card from '@/components/card';
import LoadingButton from '@/components/LoadingButton';
import CategorySelector from '@/components/CategorySelector';
import { getAdminForum, putAdminForum } from '@/api/Forum';
import { ModelForumInfo } from '@/api/types';

interface ForumFormData {
  blocks: ModelForumInfo[];
}

// 可拖拽的版块项组件
interface SortableBlockItemProps {
  index: number;
  control: any;
  onRemove: () => void;
  isEdit: boolean;
  setIsEdit: (value: boolean) => void;
}

const SortableBlockItem: React.FC<SortableBlockItemProps> = ({
  index,
  control,
  onRemove,
  isEdit,
  setIsEdit,
}) => {
  const { isDragging, attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `block-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        opacity: isDragging ? 0.5 : 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
        mb: 2,
        backgroundColor: 'background.paper',
      }}
    >
      <Stack spacing={2}>
        {/* 版块名称和操作按钮 */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton
            size="small"
            sx={{
              cursor: 'grab',
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
              flexShrink: 0,
            }}
            {...attributes}
            {...listeners}
          >
            <DragIndicatorIcon />
          </IconButton>

          <Controller
            control={control}
            name={`blocks.${index}.name`}
            rules={{ required: '请输入版块名称' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder="输入版块名称"
                label="版块名称"
                size="small"
                onChange={e => {
                  field.onChange(e.target.value);
                  setIsEdit(true);
                }}
              />
            )}
          />

          <IconButton size="small" onClick={onRemove} >
            <Icon type="icon-guanbi-fill" sx={{ color: 'text.tertiary' }} />
          </IconButton>
        </Stack>

        {/* 分组选择 */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            分类名称
          </Typography>
          <Controller
            control={control}
            name={`blocks.${index}.group_ids`}
            render={({ field }) => (
              <CategorySelector
                value={field.value || []}
                onChange={groupIds => {
                  field.onChange(groupIds);
                  setIsEdit(true);
                }}
                placeholder="请选择分类"
                label="选择分类"
              />
            )}
          />
        </Box>
      </Stack>
    </Box>
  );
};

const Forum: React.FC = () => {
  const [isEdit, setIsEdit] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  const { control, handleSubmit, reset } = useForm<ForumFormData>({
    defaultValues: {
      blocks: [],
    },
  });

  const {
    fields: blockFields,
    append: appendBlock,
    remove: removeBlock,
    move: moveBlock,
  } = useFieldArray({
    control,
    name: 'blocks',
  });

  // 获取版块数据
  const fetchData = useCallback(async () => {
    try {
      if (isInitialLoading) {
        setIsInitialLoading(true);
      } else {
        setIsLoading(true);
      }

      const response = await getAdminForum();
      reset({ blocks: response });
    } catch (error) {
      console.error('获取版块数据失败:', error);
      reset({ blocks: [] });
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [reset, isInitialLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (active.id !== over?.id) {
        const oldIndex = blockFields.findIndex((_, index) => `block-${index}` === active.id);
        const newIndex = blockFields.findIndex((_, index) => `block-${index}` === over!.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          moveBlock(oldIndex, newIndex);
          setIsEdit(true);
        }
      }
      setActiveId(null);
    },
    [blockFields, moveBlock]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleAddBlock = () => {
    if (blockFields.length >= 3) {
      message.error('最多只能创建3个版块');
      return;
    }
    appendBlock({
      name: '',
      index: blockFields.length + 1,
      group_ids: [],
    });
    setIsEdit(true);
  };

  const handleRemoveBlock = (index: number) => {
    setBlockToDelete(index);
    setShowDeleteDialog(true);
  };

  const confirmDeleteBlock = () => {
    if (blockToDelete !== null) {
      removeBlock(blockToDelete);
      setIsEdit(true);
    }
    setShowDeleteDialog(false);
    setBlockToDelete(null);
  };

  const cancelDeleteBlock = () => {
    setShowDeleteDialog(false);
    setBlockToDelete(null);
  };

  const onSubmit = async (data: ForumFormData) => {
    setIsLoading(true);
    try {
      // 将表单数据转换为 API 需要的格式
      const forums: ModelForumInfo[] = data.blocks.map((block, index) => ({
        id: block.id,
        name: block.name,
        index: index + 1, // 设置排序索引
        group_ids: block.group_ids || [],
      }));

      await putAdminForum({ forums });
      setIsEdit(false);
      message.success('版块保存成功');
      // 重新获取数据以确保数据同步
      await fetchData();
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存版块失败');
    } finally {
      setIsLoading(false);
    }
  };

  const onCancel = () => {
    fetchData();
    setIsEdit(false);
  };

  // 如果正在初始加载，显示加载状态
  if (isInitialLoading) {
    return (
      <Card>
        <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            正在加载版块数据...
          </Typography>
        </Stack>
      </Card>
    );
  }

  return (
    <Card>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography
            sx={{
              fontSize: 14,
              lineHeight: '32px',
              flexShrink: 0,
            }}
            variant="subtitle2"
          >
            版块管理
          </Typography>
          {isEdit && (
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={onCancel}>
                取消
              </Button>
              <LoadingButton
                variant="contained"
                loading={isLoading}
                onClick={handleSubmit(onSubmit)}
              >
                保存
              </LoadingButton>
            </Stack>
          )}
        </Stack>
        {blockFields.length >= 3 && <Alert severity="info">最多支持创建3个版块</Alert>}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={blockFields.map((_, index) => `block-${index}`)}
            strategy={rectSortingStrategy}
          >
            {blockFields.map((block, index) => (
              <SortableBlockItem
                key={block.id || index}
                index={index}
                control={control}
                onRemove={() => handleRemoveBlock(index)}
                isEdit={isEdit}
                setIsEdit={setIsEdit}
              />
            ))}
          </SortableContext>

          <DragOverlay adjustScale style={{ transformOrigin: '0 0' }}>
            {activeId ? (
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 2,
                  backgroundColor: 'background.paper',
                  boxShadow: 3,
                }}
              >
                <Typography variant="body2">
                  {blockFields[parseInt(activeId.split('-')[1])]?.name || '版块'}
                </Typography>
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>

        {blockFields.length < 3 && (
          <Button
            variant="text"
            color="primary"
            onClick={handleAddBlock}
            sx={{ alignSelf: 'flex-start' }}
          >
            新增一个版块
          </Button>
        )}
      </Stack>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onClose={cancelDeleteBlock}>
        <DialogTitle>确认删除版块</DialogTitle>
        <DialogContent>
          <Typography>
            如果删除版块，该版块下的所有的问答、反馈等内容也会被删除，请确认？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            删除后将无法恢复，请谨慎操作。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteBlock}>取消</Button>
          <Button onClick={confirmDeleteBlock} color="error" variant="contained">
            确认删除
          </Button>
        </DialogActions>
      </Dialog>

    </Card>
  );
};

export default Forum;
