import { Box, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { NodeDetail } from '..';
import EditorWrap from './Wrap';

interface EditProps {
  nodeId?: string;
  kbId?: string;
  onNodeDetailChange?: (detail: NodeDetail) => void;
  onGetNodeDetail?: (nodeId: string, kbId: string) => Promise<NodeDetail>;
  onSave?: (content: string, nodeId: string, kbId: string) => Promise<void>;
}

const Edit = ({ nodeId, kbId, onNodeDetailChange, onGetNodeDetail, onSave }: EditProps) => {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<NodeDetail | null>(null);
  const [error, setError] = useState<string>('');

  const getDetail = async () => {
    if (!nodeId || !kbId || !onGetNodeDetail) return;

    setLoading(true);
    setError('');

    try {
      const res = await onGetNodeDetail(nodeId, kbId);
      setDetail(res);
      onNodeDetailChange?.(res);

      // 滚动到顶部
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取文档详情失败');
      console.error('Failed to get node detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (nodeId && kbId) {
      getDetail();
    }
  }, [nodeId, kbId]);

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          p: 4,
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <Typography variant="h6" color="error">
            加载失败
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!nodeId || !kbId) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          p: 4,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          请选择要编辑的文档
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        flexGrow: 1,
        height: '100%',
        /* Tiptap collaboration styles */
        '& .collaboration-carets__caret': {
          borderLeft: '1px solid #fff',
          borderRight: '1px solid #fff',
          marginLeft: '-1px',
          marginRight: '-1px',
          pointerEvents: 'none',
          position: 'relative',
          wordBreak: 'normal',
        },
        '& .collaboration-carets__label': {
          borderRadius: '0 3px 3px 3px',
          color: '#fff',
          fontSize: '12px',
          fontStyle: 'normal',
          fontWeight: '600',
          left: '-1px',
          lineHeight: 'normal',
          padding: '0.1rem 0.3rem',
          position: 'absolute',
          top: '1.4em',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        },
        
      }}
    >
      {!loading && detail && (
        <EditorWrap
          detail={detail}
          onCancel={() => {
            setDetail(null);
          }}
          onSave={
            onSave
              ? async (content: string) => {
                  if (nodeId && kbId) {
                    await onSave(content, nodeId, kbId);
                  }
                }
              : undefined
          }
        />
      )}
    </Box>
  );
};

export default Edit;
