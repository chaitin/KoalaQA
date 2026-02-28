import { AnydocListRes } from '@/api';
import { Ellipsis } from '@ctzhian/ui';
import { Box, Checkbox, CircularProgress, Stack } from '@mui/material';
import { useMemo, type Dispatch, type SetStateAction } from 'react';

interface ImportDocProps {
  selectIds: string[];
  setSelectIds: Dispatch<SetStateAction<string[]>>;
  items: AnydocListRes[];
  loading: boolean;
  showSelectAll?: boolean;
}

const SELECT_KEY_SEP = '::';
// 子项选择 key：带上 docIdx，避免同一组里 docId 重复导致"选一个=全选"的视觉/状态问题
const getDocKey = (uuid?: string, docId?: string, docIdx?: number) =>
  `${uuid || ''}${SELECT_KEY_SEP}${docId || ''}${SELECT_KEY_SEP}${docIdx ?? ''}`;

const Doc2Ai = ({
  selectIds,
  setSelectIds,
  items,
  loading,
  showSelectAll,
}: ImportDocProps) => {
  const docEntries = useMemo(() => {
    return (items || []).flatMap(item => {
      const uuid = item.uuid || '';
      const docs = item.docs || [];
      return docs.map((doc, docIdx) => ({ uuid, doc, docIdx }));
    });
  }, [items]);

  const toggleKey = (key: string) => {
    if (!key) return;
    setSelectIds(prev => {
      if (prev.includes(key)) return prev.filter(it => it !== key);
      return [...prev, key].filter(Boolean) as string[];
    });
  };

  const getSelectableKeys = useMemo(() => {
    return docEntries
      .filter(({ uuid, doc }) => uuid && doc?.id && !doc?.error)
      .map(({ uuid, doc, docIdx }) => getDocKey(uuid, doc?.id, docIdx))
      .filter(Boolean);
  }, [docEntries]);

  // 用“全部 doc(含不可选)”来决定顶部全选的展示状态，避免“只选了部分可选项”却显示成全选
  const allKeys = useMemo(() => {
    return docEntries
      .filter(({ uuid, doc }) => uuid && doc?.id)
      .map(({ uuid, doc, docIdx }) => getDocKey(uuid, doc?.id, docIdx))
      .filter(Boolean);
  }, [docEntries]);

  const selectAllChecked = allKeys.length > 0 && allKeys.every(k => selectIds.includes(k));
  const selectAllIndeterminate = allKeys.some(k => selectIds.includes(k)) && !selectAllChecked;

  const visibleEntries = useMemo(() => {
    if (!showSelectAll) return [];
    return docEntries;
  }, [docEntries, showSelectAll]);

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
        {visibleEntries.map(({ uuid, doc, docIdx }, idx) => {
          const docId = doc?.id || '';
          const docError = doc?.error;
          const docKey = docId ? getDocKey(uuid, docId, docIdx) : '';
          const selectable = !!(showSelectAll && uuid && docId && !docError);
          const isLast = idx === visibleEntries.length - 1;
          const rowKey = docKey || `${uuid}-${docIdx}-${idx}`;
          return (
            <Stack
              key={rowKey}
              direction={'row'}
              alignItems={'center'}
              gap={1}
              sx={{
                px: 2,
                py: 1,
                borderBottom: isLast ? 'none' : '1px solid',
                borderColor: 'divider',
                ':hover': {
                  bgcolor: 'background.paper2',
                },
              }}
            >
              {selectable ? (
                <Checkbox
                  size="small"
                  sx={{ flexShrink: 0, p: 0, m: 0 }}
                  checked={selectIds.includes(docKey)}
                  disabled={loading || !!docError}
                  onChange={e => {
                    e.stopPropagation();
                    toggleKey(docKey);
                  }}
                />
              ) :
                loading && selectIds.includes(docKey) ? (
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
                ) : null}

              <Box
                sx={{ flexGrow: 1, width: 0, cursor: selectable ? 'pointer' : 'default' }}
                onClick={() => {
                  if (selectable && !loading && !docError) {
                    toggleKey(docKey);
                  }
                }}
              >
                <Ellipsis sx={{ fontSize: 14 }}>{doc?.title || '未识别文档'}</Ellipsis>
                {doc?.summary && (
                  <Ellipsis sx={{ fontSize: 12, color: 'text.auxiliary' }}>
                    {doc.summary}
                  </Ellipsis>
                )}
                {docError && (
                  <Box sx={{ fontSize: 12, color: 'error.main', mt: 0.5 }}>{docError}</Box>
                )}
              </Box>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
};

export default Doc2Ai;
