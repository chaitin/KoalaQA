import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FC } from 'react';
import { Control, FieldErrors, useWatch } from 'react-hook-form';
import { Box, Button, Chip, IconButton, Stack, Typography } from '@mui/material';
import { Icon } from '@ctzhian/ui';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

type SortableItemProps = {
  id: string;
  groupIndex: number;
  control: Control<any>;
  errors: FieldErrors<any>;
  setIsEdit: (value: boolean) => void;
  handleRemove: () => void;
  onEdit: () => void;
};

const SortableItem: FC<SortableItemProps> = ({
  id,
  groupIndex,
  control,
  handleRemove,
  onEdit,
  ...rest
}) => {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
  };

  const groupName = useWatch({
    control,
    name: `brand_groups.${groupIndex}.name`,
  }) as string;

  const links = useWatch({
    control,
    name: `brand_groups.${groupIndex}.links`,
  }) as { name: string; id: number }[];

  const optionCount = links?.length || 0;

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
        backgroundColor: 'background.default',
      }}
    >
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

        <Typography
          variant="body1"
          sx={{
            fontSize: 14,
            fontWeight: 500,
            flex: 1,
          }}
        >
          {groupName || '未命名分类'}
        </Typography>

        {optionCount > 0 && (
          <Chip
            label={`${optionCount}个选项`}
            size="small"
            sx={{
              height: 24,
              fontSize: 12,
              backgroundColor: '#F8F9FA',
              color: 'text.secondary',
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
        )}

        <Button
          size="small"
          variant="text"
          onClick={onEdit}
          sx={{
            minWidth: 'auto',
            px: 1.5,
            fontSize: 14,
            color: 'text.primary',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          编辑
        </Button>

        <IconButton
          size="small"
          onClick={handleRemove}
          sx={{
            color: 'text.tertiary',
            '&:hover': {
              color: 'error.main',
            },
          }}
        >
          <Icon type="icon-guanbi-fill" />
        </IconButton>
      </Stack>
    </Box>
  );
};

export default SortableItem;
