import { putAdminGroup } from '@/api';
import Card from '@/components/card';
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
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { Box, Button, Stack, Typography } from '@mui/material';
import { message } from '@ctzhian/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { eventManager, EVENTS } from '@/utils/eventManager';
import { useGroupData } from '@/context/GroupDataContext';
import SortableItem from './SortableItem';
import EditDialog from './EditDialog';

const formSchema = z.object({
  brand_groups: z.array(
    z.object({
      name: z
        .string()
        .refine(val => val.trim().length > 0, {
          message: '分类名称不能为空',
        }),
      id: z.number(),
      links: z.array(
        z.object({
          name: z
            .string()
            .refine(val => val.trim().length > 0, {
              message: '选项名称不能为空',
            }),
          id: z.number(),
        })
      ),
    })
  ),
});

type FormData = z.infer<typeof formSchema>;

const DragBrand = () => {
  const { groups, refresh } = useGroupData();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null);
  const groupSnapshotRef = useRef<{ name: string; links: { name: string; id: number }[] } | null>(
    null
  );
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));
  const {
    control,
    reset,
    getValues,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brand_groups: [],
    },
  });
  const {
    fields: brandGroupFields,
    append: appendBrandGroup,
    remove: removeBrandGroup,
    move,
  } = useFieldArray({
    control,
    name: 'brand_groups',
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // 当 groups 数据更新时，同步到表单
  useEffect(() => {
    reset({
      brand_groups: groups.map(item => ({
        name: item.name || '',
        id: item.id || 0,
        links: item.items || [],
      })),
    });
  }, [groups, reset]);
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (active.id !== over?.id) {
        const oldIndex = brandGroupFields.findIndex((_, index) => `group-${index}` === active.id);
        const newIndex = brandGroupFields.findIndex((_, index) => `group-${index}` === over!.id);
        move(oldIndex, newIndex);

        // 排序成功后自动保存
        try {
          const currentData = getValues('brand_groups');
          await putAdminGroup({
            groups: currentData.map((item, index) => ({
              name: item.name,
              id: item.id,
              index,
              items: item.links.map((link, i) => ({ ...link, index: i })),
            })),
          });
          // 刷新分组数据
          await refresh();
          // 显示成功提示
          message.success('排序调整成功');
          // 触发分类更新事件，通知其他组件
          const getTimestamp = () => Date.now();
          eventManager.emit(EVENTS.CATEGORY_UPDATED, {
            timestamp: getTimestamp(),
            message: '分类信息已更新',
          });
        } catch (error) {
          console.error('保存排序失败:', error);
          message.error('保存排序失败');
        }
      }
      setActiveId(null);
    },
    [brandGroupFields, move, getValues, refresh]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleRemove = useCallback(
    (index: number) => {
      removeBrandGroup(index);
    },
    [removeBrandGroup]
  );

  const handleAddBrandGroup = () => {
    const newIndex = brandGroupFields.length;
    appendBrandGroup({
      name: '',
      id: 0,
      links: [{ name: '', id: 0 }],
    });
    // 新增后自动打开编辑弹窗
    setEditingGroupIndex(newIndex);
  };

  const handleEditGroup = (groupIndex: number) => {
    // 保存打开弹窗时的初始值快照
    const currentGroup = getValues(`brand_groups.${groupIndex}`);
    groupSnapshotRef.current = {
      name: currentGroup?.name || '',
      links: currentGroup?.links ? JSON.parse(JSON.stringify(currentGroup.links)) : [],
    };
    setEditingGroupIndex(groupIndex);
  };

  const handleCloseEditDialog = (shouldRestore: boolean = false) => {
    if (editingGroupIndex !== null) {
      // 如果取消且没有快照（说明是新增的），删除新增的分类
      if (shouldRestore && !groupSnapshotRef.current) {
        removeBrandGroup(editingGroupIndex);
      }
      // 如果有快照（说明是编辑），恢复初始值
      else if (shouldRestore && groupSnapshotRef.current) {
        const snapshot = groupSnapshotRef.current;
        setValue(`brand_groups.${editingGroupIndex}.name`, snapshot.name);
        setValue(`brand_groups.${editingGroupIndex}.links`, snapshot.links);
      }
    }
    groupSnapshotRef.current = null;
    setEditingGroupIndex(null);
  };

  const onSubmit = async () => {
    try {
      const currentData = getValues('brand_groups');
      await putAdminGroup({
        groups: currentData.map((item, index) => ({
          name: item.name,
          id: item.id,
          index,
          items: item.links.map((link, i) => ({ ...link, index: i })),
        })),
      });
      // 刷新分组数据
      await refresh();
      // 触发分类更新事件，通知其他组件
      const getTimestamp = () => Date.now();
      eventManager.emit(EVENTS.CATEGORY_UPDATED, {
        timestamp: getTimestamp(),
        message: '分类信息已更新',
      });
      message.success('保存成功');
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    }
  };

  return (
    <Card>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontSize: 14,
            flexShrink: 0,
            my: 1,
          }}
        >
          分类管理
        </Typography>
        <Button variant="text" color="info" onClick={handleAddBrandGroup}>
          新增一个分类
        </Button>
      </Stack>
      {brandGroupFields.length === 0 ? (
        <Button size="small" variant="text" color="info" onClick={handleAddBrandGroup}>
          新增一个分类
        </Button>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={brandGroupFields.map((_, index) => `group-${index}`)}
            strategy={rectSortingStrategy}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {brandGroupFields.map((group, groupIndex) => (
                <SortableItem
                  key={group.id || groupIndex}
                  id={`group-${groupIndex}`}
                  groupIndex={groupIndex}
                  control={control}
                  errors={errors}
                  handleRemove={() => handleRemove(groupIndex)}
                  onEdit={() => handleEditGroup(groupIndex)}
                />
              ))}
            </Box>
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
                  minWidth: 200,
                }}
              >
                <Typography variant="body2">
                  {brandGroupFields[parseInt(activeId.split('-')[1])]?.name || '分类'}
                </Typography>
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* 编辑弹窗 */}
      {editingGroupIndex !== null && (
        <EditDialog
          open={editingGroupIndex !== null}
          onClose={() => handleCloseEditDialog(false)}
          onCancel={() => handleCloseEditDialog(true)}
          groupIndex={editingGroupIndex}
          control={control}
          getValues={getValues}
          trigger={trigger}
          onSave={onSubmit}
        />
      )}
    </Card>
  );
};

export default DragBrand;
