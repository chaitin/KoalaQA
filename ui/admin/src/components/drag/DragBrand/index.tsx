import { putAdminGroup } from '@/api';
import Card from '@/components/card';
import LoadingButton from '@/components/LoadingButton';
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
import { useCallback, useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { eventManager, EVENTS } from '@/utils/eventManager';
import { useGroupData } from '@/context/GroupDataContext';
import Item from './Item';
import SortableItem from './SortableItem';

const DragBrand = () => {
  const { groups, refresh } = useGroupData();
  const [isEdit, setIsEdit] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{
    brand_groups: {
      name: string;
      id: number;
      links: { name: string; id: number }[];
    }[];
  }>({
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
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (active.id !== over?.id) {
        const oldIndex = brandGroupFields.findIndex((_, index) => `group-${index}` === active.id);
        const newIndex = brandGroupFields.findIndex((_, index) => `group-${index}` === over!.id);
        move(oldIndex, newIndex);
        setIsEdit(true);
      }
      setActiveId(null);
    },
    [brandGroupFields, move, setIsEdit]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleRemove = useCallback(
    (index: number) => {
      removeBrandGroup(index);
      setIsEdit(true);
    },
    [removeBrandGroup, setIsEdit]
  );

  const handleAddBrandGroup = () => {
    appendBrandGroup({
      name: '',
      id: 0,
      links: [{ name: '', id: 0 }],
    });
    setIsEdit(true);
  };

  const onSubmit = handleSubmit(async data => {
    await putAdminGroup({
      groups: data.brand_groups.map((item, index) => ({
        name: item.name,
        id: item.id,
        index,
        items: item.links.map((link, i) => ({ ...link, index: i })),
      })),
    });
    setIsEdit(false);
    // 刷新分组数据
    await refresh();
    // 触发分类更新事件，通知其他组件
    eventManager.emit(EVENTS.CATEGORY_UPDATED, {
      timestamp: Date.now(),
      message: '分类信息已更新',
    });
  });

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
        {isEdit && (
          <LoadingButton variant="contained" size="small" onClick={onSubmit}>
            保存
          </LoadingButton>
        )}
      </Stack>
      {brandGroupFields.length === 0 ? (
        <Button size="small" variant="text" color="info" onClick={handleAddBrandGroup}>
          新增一个分类
        </Button>
      ) : (
        <>
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {brandGroupFields.map((group, groupIndex) => (
                  <SortableItem
                    key={group.id}
                    id={`group-${groupIndex}`}
                    groupIndex={groupIndex}
                    control={control}
                    errors={errors}
                    setIsEdit={setIsEdit}
                    handleRemove={() => handleRemove(groupIndex)}
                  />
                ))}
              </Box>
            </SortableContext>
            <DragOverlay adjustScale style={{ transformOrigin: '0 0' }}>
              {activeId ? (
                <Item
                  isDragging
                  groupIndex={parseInt(activeId.split('-')[1])}
                  control={control}
                  errors={errors}
                  setIsEdit={setIsEdit}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
          <Button size="small" variant="text" color="info" onClick={handleAddBrandGroup}>
            新增一个分类
          </Button>
        </>
      )}
    </Card>
  );
};

export default DragBrand;
