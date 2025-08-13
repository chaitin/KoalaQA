import { AnydocListRes, TopicTaskStatus } from '@/api';
import { TaskType } from '@/hooks/useExportDoc';
import { Box, Button, Checkbox, Skeleton, Stack } from '@mui/material';
import { Ellipsis, Icon } from 'ct-mui';

interface ImportDocProps {
  selectIds: string[];
  setSelectIds: React.Dispatch<React.SetStateAction<string[]>>;
  items: AnydocListRes[];
  loading: boolean;
  taskIds: TaskType[];
  handleImport: (selectIds: string[], items: AnydocListRes[]) => Promise<void>;
  showSelectAll?: boolean;
}
const Doc2Ai = ({
  selectIds,
  setSelectIds,
  taskIds,
  items,
  loading,
  handleImport,
  showSelectAll,
}: ImportDocProps) => {
  return (
    <Box
      sx={{
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        maxHeight: 'calc(100vh - 300px)',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      {showSelectAll && (
        <Stack
          direction={'row'}
          alignItems={'center'}
          gap={1}
          sx={{
            px: 2,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Checkbox
            size='small'
            sx={{ flexShrink: 0, p: 0, m: 0 }}
            checked={selectIds.length === items.length}
            onChange={() => {
              if (selectIds.length === items.length) {
                setSelectIds([]);
              } else {
                setSelectIds(
                  items.map((item) => item.uuid || '').filter(Boolean)
                );
              }
            }}
          />
          <Box sx={{ fontSize: 14 }}>全选</Box>
        </Stack>
      )}
      <Stack>
        {loading && (
          <Stack
            direction={'row'}
            alignItems={'center'}
            gap={1}
            sx={{
              px: 2,
              py: 1,
              cursor: 'pointer',
              bgcolor: 'background.paper2',
            }}
          >
            <Stack
              direction={'row'}
              justifyContent={'center'}
              alignItems={'center'}
              sx={{ flexShrink: 0, width: 20, height: 20 }}
            >
              <Icon
                type='icon-shuaxin'
                sx={{
                  fontSize: 18,
                  color: 'text.auxiliary',
                  animation: 'loadingRotate 1s linear infinite',
                }}
              />
            </Stack>
            <Box component='label' sx={{ flexGrow: 1 }}>
              <Skeleton variant='text' width={200} height={21} />
              <Skeleton variant='text' height={18} />
            </Box>
          </Stack>
        )}
        {items.map((item, idx) => {
          const task = taskIds.find((item2) => item2.uuid === item.uuid);
          return (
            <Stack
              direction={'row'}
              alignItems={'center'}
              gap={1}
              key={item.uuid}
              sx={{
                px: 2,
                py: 1,
                cursor: 'pointer',
                borderBottom: idx === items.length - 1 ? 'none' : '1px solid',
                borderColor: 'divider',
                ':hover': {
                  bgcolor: 'background.paper2',
                },
              }}
            >
              {!task ? (
                <Checkbox
                  size='small'
                  id={item.uuid}
                  sx={{ flexShrink: 0, p: 0, m: 0 }}
                  checked={selectIds.includes(item.uuid || '')}
                  onChange={() => {
                    setSelectIds((prev) => {
                      if (prev.includes(item.uuid || '')) {
                        return prev.filter((it) => it !== item.uuid);
                      }
                      return [...prev, item.uuid].filter(Boolean) as string[];
                    });
                  }}
                />
              ) : [
                  TopicTaskStatus.TaskStatusInProgress,
                  TopicTaskStatus.TaskStatusPending,
                ].includes(task?.status as TopicTaskStatus) ? (
                <Icon
                  type='icon-shuaxin'
                  sx={{
                    fontSize: 18,
                    color: 'text.auxiliary',
                    animation: 'loadingRotate 1s linear infinite',
                  }}
                />
              ) : (
                <Stack
                  direction={'row'}
                  justifyContent={'center'}
                  alignItems={'center'}
                  sx={{ flexShrink: 0, width: 20, height: 20 }}
                >
                  {task.status === TopicTaskStatus.TaskStatusFailed ? (
                    <Icon
                      type='icon-icon_tool_close'
                      sx={{ fontSize: 18, color: 'error.main' }}
                    />
                  ) : (
                    <Icon
                      type='icon-duihao'
                      sx={{ fontSize: 18, color: 'success.main' }}
                    />
                  )}
                </Stack>
              )}
              <Box
                component='label'
                sx={{ flexGrow: 1, cursor: 'pointer', width: 0 }}
                htmlFor={item.uuid}
              >
                <Ellipsis sx={{ fontSize: 14 }}>
                  {item.docs?.[0].title}
                </Ellipsis>
                {item.docs?.[0].summary && (
                  <Ellipsis sx={{ fontSize: 12, color: 'text.auxiliary' }}>
                    {item.docs?.[0].summary}
                  </Ellipsis>
                )}
              </Box>
              {[
                TopicTaskStatus.TaskStatusFailed,
                TopicTaskStatus.TaskStatusTimeout,
              ].includes(task?.status || TopicTaskStatus.TaskStatusCompleted) && (
                <Button
                  size='small'
                  variant='outlined'
                  onClick={() => {
                    if (!item.uuid) return;
                    handleImport([item.uuid], items);
                  }}
                >
                  重新导入
                </Button>
              )}
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
};

export default Doc2Ai;
