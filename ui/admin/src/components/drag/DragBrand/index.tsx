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
import { Box, Button, Stack } from '@mui/material';
import { Icon } from 'ct-mui';
import { FC, useCallback, useEffect, useState } from 'react';
import { Control, FieldErrors, useFieldArray, useForm } from 'react-hook-form';
import Item from './Item';
import SortableItem from './SortableItem';
import { getAdminGroup, getGroup } from '@/api';

interface DragBrandProps {
  control: Control<any>;
  errors: FieldErrors<any>;
  setIsEdit: (value: boolean) => void;
}

const DragBrand = () => {
  const [isEdit, setIsEdit] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      brand_groups: [] as any,
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
  useEffect(() => {
    getAdminGroup().then((res) => {
      reset({
        brand_groups: res.items?.map((item) => ({
          name: item.name,
          links: item.items,
        })),
      });
    });
  }, []);
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (active.id !== over?.id) {
        const oldIndex = brandGroupFields.findIndex(
          (_, index) => `group-${index}` === active.id
        );
        const newIndex = brandGroupFields.findIndex(
          (_, index) => `group-${index}` === over!.id
        );
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
      links: [{ name: '' }],
    });
    setIsEdit(true);
  };

  if (brandGroupFields.length === 0) {
    return (
      <Button
        size='small'
        startIcon={
          <Icon type='icon-add' sx={{ fontSize: '12px !important' }} />
        }
        onClick={handleAddBrandGroup}
      >
        添加一个分类
      </Button>
    );
  }

  const onSubmit = handleSubmit((data) => {
    console.log(data);
    
  });

  return (
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
      <Button
        size='small'
        startIcon={
          <Icon type='icon-add' sx={{ fontSize: '12px !important' }} />
        }
        onClick={handleAddBrandGroup}
      >
        添加一个分类
      </Button>
      <Stack>
        {isEdit && (
          <Button
            sx={{ alignSelf: 'flex-start' }}
            variant='contained'
            size='small'
            onClick={onSubmit}
          >
            保存
          </Button>
        )}
      </Stack>
    </>
  );
};

export default DragBrand;
