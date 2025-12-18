import { AnydocListRes, TopicTaskStatus } from '@/api';
import { TaskType } from '@/hooks/useExportDoc';
import { Ellipsis, Icon } from '@ctzhian/ui';
import { KeyboardArrowDown, KeyboardArrowRight } from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Collapse,
  IconButton,
  Stack,
} from '@mui/material';
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';

interface ImportDocProps {
  selectIds: string[];
  setSelectIds: Dispatch<SetStateAction<string[]>>;
  items: AnydocListRes[];
  loading: boolean;
  taskIds: TaskType[];
  handleImport: (selectIds: string[], items: AnydocListRes[]) => Promise<void>;
  showSelectAll?: boolean;
  isCompleted?: boolean;
}

const SELECT_KEY_SEP = '::';
// 子项选择 key：带上 docIdx，避免同一组里 docId 重复导致"选一个=全选"的视觉/状态问题
const getDocKey = (uuid?: string, docId?: string, docIdx?: number) =>
  `${uuid || ''}${SELECT_KEY_SEP}${docId || ''}${SELECT_KEY_SEP}${docIdx ?? ''}`;

const Doc2Ai = ({
  selectIds,
  setSelectIds,
  taskIds,
  items,
  loading,
  handleImport,
  showSelectAll,
}: ImportDocProps) => {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const toggleKey = (key: string) => {
    if (!key) return;
    setSelectIds(prev => {
      if (prev.includes(key)) return prev.filter(it => it !== key);
      return [...prev, key].filter(Boolean) as string[];
    });
  };

  const taskByDocId = useMemo(() => {
    const map = new Map<string, TaskType>();
    taskIds.forEach(t => {
      if (t.docId) map.set(t.docId, t);
    });
    return map;
  }, [taskIds]);

  const getSelectableKeys = useMemo(() => {
    return (items || []).flatMap(item => {
      const uuid = item.uuid || '';
      const docs = item.docs || [];
      if (!uuid) return [];
      if (docs.length === 0) return [];
      if (docs.length === 1) {
        const docId = docs[0]?.id || '';
        if (!docId) return [];
        return taskByDocId.has(docId) ? [] : [getDocKey(uuid, docId, 0)];
      }
      return docs
        .map((d, docIdx) => ({ d, docIdx }))
        .filter(({ d }) => d?.id && !taskByDocId.has(d.id))
        .map(({ d, docIdx }) => getDocKey(uuid, d.id, docIdx))
        .filter(Boolean);
    });
  }, [items, taskByDocId]);

  // 用“全部 doc(含不可选)”来决定顶部全选的展示状态，避免“只选了部分可选项”却显示成全选
  const allKeys = useMemo(() => {
    return (items || []).flatMap(item => {
      const uuid = item.uuid || '';
      const docs = item.docs || [];
      if (!uuid) return [];
      if (docs.length === 0) return [];
      if (docs.length === 1) {
        const docId = docs[0]?.id || '';
        return docId ? [getDocKey(uuid, docId, 0)] : [];
      }
      return docs.map((d, docIdx) => (d?.id ? getDocKey(uuid, d.id, docIdx) : '')).filter(Boolean);
    });
  }, [items]);

  const selectAllChecked = allKeys.length > 0 && allKeys.every(k => selectIds.includes(k));
  const selectAllIndeterminate = allKeys.some(k => selectIds.includes(k)) && !selectAllChecked;

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
            size="small"
            sx={{ flexShrink: 0, p: 0, m: 0 }}
            checked={selectAllChecked}
            indeterminate={selectAllIndeterminate}
            disabled={loading}
            onChange={() => {
              if (selectAllChecked) {
                setSelectIds([]);
              } else {
                setSelectIds(getSelectableKeys);
              }
            }}
          />
          <Box sx={{ fontSize: 14 }}>全选</Box>
        </Stack>
      )}
      <Stack>
        {(() => {
          const filteredItems = items.filter(item => {
            // 如果显示选择框，显示所有文档；否则只显示有任务的文档
            if (showSelectAll) return true;
            const docs = item.docs || [];
            return docs.some(d => d?.id && taskByDocId.has(d.id));
          });
          return filteredItems.map((item, idx) => {
          const uuid = item.uuid || '';
          const docs = item.docs || [];
          const hasChildren = docs.length > 1;

          const selectableChildKeys = hasChildren
            ? docs
                .map((d, docIdx) => ({ d, docIdx }))
                .filter(({ d }) => d?.id && !taskByDocId.has(d.id))
                .map(({ d, docIdx }) => getDocKey(uuid, d.id, docIdx))
                .filter(Boolean)
            : [];

          const allChildKeys = hasChildren
            ? docs.map((d, docIdx) => (d?.id ? getDocKey(uuid, d.id, docIdx) : '')).filter(Boolean)
            : [];
          const selectedSelectableChildCount = selectableChildKeys.filter(k =>
            selectIds.includes(k)
          ).length;
          const selectableAllSelected =
            hasChildren &&
            selectableChildKeys.length > 0 &&
            selectedSelectableChildCount === selectableChildKeys.length;

          // 父级 checkbox 只有在“所有子 doc 都可选且都被选中”才显示 checked，否则显示 indeterminate
          const parentChecked =
            hasChildren &&
            selectableAllSelected &&
            allChildKeys.length > 0 &&
            allChildKeys.length === selectableChildKeys.length;
          const parentIndeterminate =
            hasChildren && selectedSelectableChildCount > 0 && !parentChecked;

          const docTasks = docs
            .map(d => (d?.id ? taskByDocId.get(d.id) : undefined))
            .filter(Boolean) as TaskType[];
          const anyInProgress = docTasks.some(t =>
            [TopicTaskStatus.TaskStatusInProgress, TopicTaskStatus.TaskStatusPending].includes(
              t.status as TopicTaskStatus
            )
          );
          const anyFailed = docTasks.some(t =>
            [TopicTaskStatus.TaskStatusFailed, TopicTaskStatus.TaskStatusTimeout].includes(
              t.status as TopicTaskStatus
            )
          );
          const allCompleted =
            docTasks.length > 0 &&
            docTasks.every(t => t.status === TopicTaskStatus.TaskStatusCompleted);

          // docs.length === 1：保持兼容，仍然以 uuid 作为选择键
          const singleDocId = docs.length === 1 ? docs[0]?.id || '' : '';
          const singleTask = singleDocId ? taskByDocId.get(singleDocId) : undefined;
          const singleKey = singleDocId ? getDocKey(uuid, singleDocId, 0) : '';
          const singleSelectable = !!(showSelectAll && uuid && singleDocId && !singleTask);

          return (
            <Box key={uuid || idx}>
              <Stack
                direction={'row'}
                alignItems={'center'}
                gap={1}
                sx={{
                  px: 2,
                  py: 1,
                  cursor: hasChildren ? 'default' : 'pointer',
                  borderBottom: idx === filteredItems.length - 1 && !hasChildren ? 'none' : '1px solid',
                  borderColor: 'divider',
                  ':hover': {
                    bgcolor: 'background.paper2',
                  },
                }}
              >
                {hasChildren ? (
                  <IconButton
                    size="small"
                    sx={{ p: 0, m: 0 }}
                    onClick={() => {
                      if (!uuid) return;
                      setOpenMap(prev => ({ ...prev, [uuid]: !prev[uuid] }));
                    }}
                  >
                    {openMap[uuid] ? (
                      <KeyboardArrowDown fontSize="small" />
                    ) : (
                      <KeyboardArrowRight fontSize="small" />
                    )}
                  </IconButton>
                ) : null}

                {hasChildren ? (
                  showSelectAll && selectableChildKeys.length > 0 ? (
                    <Checkbox
                      size="small"
                      sx={{ flexShrink: 0, p: 0, m: 0 }}
                      checked={parentChecked}
                      indeterminate={parentIndeterminate}
                      disabled={loading}
                      onChange={() => {
                        setSelectIds(prev => {
                          if (selectableAllSelected) {
                            return prev.filter(k => !selectableChildKeys.includes(k));
                          }
                          const merged = new Set(prev);
                          selectableChildKeys.forEach(k => merged.add(k));
                          return Array.from(merged);
                        });
                      }}
                    />
                  ) : anyInProgress ||
                    (loading && selectableChildKeys.some(key => selectIds.includes(key))) ? (
                    <Icon
                      type="icon-shuaxin"
                      sx={{
                        fontSize: 18,
                        color: 'text.auxiliary',
                        animation: 'loadingRotate 1s linear infinite',
                      }}
                    />
                  ) : docTasks.length > 0 ? (
                    <Stack
                      direction={'row'}
                      justifyContent={'center'}
                      alignItems={'center'}
                      sx={{ flexShrink: 0, width: 20, height: 20 }}
                    >
                      {anyFailed ? (
                        <Icon
                          type="icon-icon_tool_close"
                          sx={{ fontSize: 18, color: 'error.main' }}
                        />
                      ) : allCompleted ? (
                        <Icon type="icon-duihao" sx={{ fontSize: 18, color: 'success.main' }} />
                      ) : (
                        <Icon type="icon-duihao" sx={{ fontSize: 18, color: 'success.main' }} />
                      )}
                    </Stack>
                  ) : null
                ) : singleSelectable ? (
                  <Checkbox
                    size="small"
                    sx={{ flexShrink: 0, p: 0, m: 0 }}
                    checked={selectIds.includes(singleKey)}
                    disabled={loading}
                    onChange={e => {
                      e.stopPropagation();
                      toggleKey(singleKey);
                    }}
                  />
                ) : loading && selectIds.includes(singleKey) ? (
                  <CircularProgress
                    size={18}
                    color="primary"
                    thickness={4}
                    sx={{
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                      },
                    }}
                  />
                ) : [
                    TopicTaskStatus.TaskStatusInProgress,
                    TopicTaskStatus.TaskStatusPending,
                  ].includes(singleTask?.status as TopicTaskStatus) ? (
                  <Icon
                    type="icon-shuaxin"
                    sx={{
                      fontSize: 18,
                      color: 'text.auxiliary',
                      animation: 'loadingRotate 1s linear infinite',
                    }}
                  />
                ) : singleTask ? (
                  <Stack
                    direction={'row'}
                    justifyContent={'center'}
                    alignItems={'center'}
                    sx={{ flexShrink: 0, width: 20, height: 20 }}
                  >
                    {[TopicTaskStatus.TaskStatusFailed, TopicTaskStatus.TaskStatusTimeout].includes(
                      singleTask.status as TopicTaskStatus
                    ) ? (
                      <Icon
                        type="icon-icon_tool_close"
                        sx={{ fontSize: 18, color: 'error.main' }}
                      />
                    ) : (
                      <Icon type="icon-duihao" sx={{ fontSize: 18, color: 'success.main' }} />
                    )}
                  </Stack>
                ) : null}

                <Box
                  sx={{
                    flexGrow: 1,
                    cursor: hasChildren ? 'pointer' : 'default',
                    width: 0,
                  }}
                  onClick={() => {
                    if (hasChildren && uuid) {
                      setOpenMap(prev => ({ ...prev, [uuid]: !prev[uuid] }));
                      return;
                    }
                    // docs.length === 1 且可选：点击标题也切换勾选
                    if (!hasChildren && singleSelectable && !loading) {
                      toggleKey(singleKey);
                    }
                  }}
                >
                  <Ellipsis sx={{ fontSize: 14 }}>
                    {docs?.[0]?.title || '未识别文档'}
                    {hasChildren ? `（${docs.length}个子文档）` : ''}
                  </Ellipsis>
                  {docs?.[0]?.summary && (
                    <Ellipsis sx={{ fontSize: 12, color: 'text.auxiliary' }}>
                      {docs?.[0]?.summary}
                    </Ellipsis>
                  )}
                </Box>

                {!hasChildren &&
                  singleTask &&
                  [TopicTaskStatus.TaskStatusFailed, TopicTaskStatus.TaskStatusTimeout].includes(
                    singleTask.status as TopicTaskStatus
                  ) && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        if (!uuid || !singleDocId) return;
                        handleImport([singleKey], items);
                      }}
                    >
                      重新导入
                    </Button>
                  )}
              </Stack>

              {hasChildren && (
                <Collapse in={!!openMap[uuid]} timeout="auto" unmountOnExit>
                  <Stack sx={{ pb: 0.5 }}>
                    {docs.map((doc, docIdx) => {
                      const docId = doc?.id || '';
                      const task = docId ? taskByDocId.get(docId) : undefined;
                      const docKey = getDocKey(uuid, docId, docIdx);
                      const selectable = !!(showSelectAll && uuid && docId && !task);
                      return (
                        <Stack
                          key={docId || docIdx}
                          direction={'row'}
                          alignItems={'center'}
                          gap={1}
                          sx={{
                            pl: 6,
                            pr: 2,
                            py: 0.75,
                            cursor: 'pointer',
                            ':hover': {
                              bgcolor: 'background.paper2',
                            },
                          }}
                          onClick={() => {
                            if (selectable && !loading) toggleKey(docKey);
                          }}
                        >
                          {selectable ? (
                            <Checkbox
                              size="small"
                              sx={{ flexShrink: 0, p: 0, m: 0 }}
                              checked={selectIds.includes(docKey)}
                              disabled={loading}
                              onChange={e => {
                                e.stopPropagation();
                                toggleKey(docKey);
                              }}
                            />
                          ) : loading && selectIds.includes(docKey) ? (
                            <CircularProgress
                              size={18}
                              color="primary"
                              thickness={4}
                              sx={{
                                '& .MuiCircularProgress-circle': {
                                  strokeLinecap: 'round',
                                },
                              }}
                            />
                          ) : [
                              TopicTaskStatus.TaskStatusInProgress,
                              TopicTaskStatus.TaskStatusPending,
                            ].includes(task?.status as TopicTaskStatus) ? (
                            <Icon
                              type="icon-shuaxin"
                              sx={{
                                fontSize: 18,
                                color: 'text.auxiliary',
                                animation: 'loadingRotate 1s linear infinite',
                              }}
                            />
                          ) : task ? (
                            <Stack
                              direction={'row'}
                              justifyContent={'center'}
                              alignItems={'center'}
                              sx={{ flexShrink: 0, width: 20, height: 20 }}
                            >
                              {[
                                TopicTaskStatus.TaskStatusFailed,
                                TopicTaskStatus.TaskStatusTimeout,
                              ].includes(task.status as TopicTaskStatus) ? (
                                <Icon
                                  type="icon-icon_tool_close"
                                  sx={{ fontSize: 18, color: 'error.main' }}
                                />
                              ) : (
                                <Icon
                                  type="icon-duihao"
                                  sx={{ fontSize: 18, color: 'success.main' }}
                                />
                              )}
                            </Stack>
                          ) : null}

                          <Box sx={{ flexGrow: 1, cursor: 'pointer', width: 0 }}>
                            <Ellipsis sx={{ fontSize: 13 }}>{doc.title || '未命名'}</Ellipsis>
                            {doc.summary && (
                              <Ellipsis sx={{ fontSize: 12, color: 'text.auxiliary' }}>
                                {doc.summary}
                              </Ellipsis>
                            )}
                          </Box>

                          {task &&
                            [
                              TopicTaskStatus.TaskStatusFailed,
                              TopicTaskStatus.TaskStatusTimeout,
                            ].includes(task.status as TopicTaskStatus) && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={e => {
                                  e.stopPropagation();
                                  if (!uuid || !docId) return;
                                  handleImport([docKey], items);
                                }}
                              >
                                重新导入
                              </Button>
                            )}
                        </Stack>
                      );
                    })}
                  </Stack>
                </Collapse>
              )}
            </Box>
          );
        });
        })()}
      </Stack>
    </Box>
  );
};

export default Doc2Ai;
