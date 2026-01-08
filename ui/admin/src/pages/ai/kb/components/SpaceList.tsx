import { SvcListSpaceItem } from '@/api';
import { Card } from '@ctzhian/ui';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Box, Button, Divider, IconButton, Stack, Typography } from '@mui/material';
import { getPlatformLabel } from '../utils';

interface SpaceListProps {
  spaces: SvcListSpaceItem[];
  selectedSpaceId: number | null;
  onSpaceClick: (space: SvcListSpaceItem) => void;
  onMenuClick: (event: React.MouseEvent<HTMLButtonElement>, space: SvcListSpaceItem) => void;
  onCreateClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const SpaceList = ({
  spaces,
  selectedSpaceId,
  onSpaceClick,
  onMenuClick,
  onCreateClick,
}: SpaceListProps) => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'none',
      }}
    >
      {/* 标题和创建按钮 */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ fontSize: 14, color: 'text.secondary' }}>
          共 {spaces.length} 个知识库
        </Typography>
        <Button variant="contained" onClick={onCreateClick}>
          关联知识库
        </Button>
      </Stack>

      {/* 知识库分类列表 */}
      <Stack spacing={2} sx={{ flex: 1, boxShadow: 'none', overflow: 'auto' }}>
        {spaces.map(space => (
          <Box
            key={space.id}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow:
                '0px 0px 10px 0px rgba(54,59,76,0.1), 0px 0px 1px 1px rgba(54,59,76,0.03)',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: selectedSpaceId === space.id ? '#3248F2' : 'transparent',
              '&:hover': {
                borderColor: '#3248F2',
                '& .kb_title': {
                  color: '#3860F4',
                },
              },
              ...(selectedSpaceId === space.id && {
                '& .kb_title': {
                  color: '#3860F4',
                },
              }),
            }}
            onClick={() => onSpaceClick(space)}
          >
            <Box sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="subtitle2" className="kb_title" sx={{ fontSize: 16 }}>
                  {space.title}
                </Typography>
              </Stack>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ my: 2 }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                  知识库数量
                </Typography>
                <Typography variant="subtitle2" sx={{ fontSize: '12px', pr: '14px' }}>
                  {space.total || 0}
                </Typography>
              </Stack>
              <Divider sx={{ borderStyle: 'dashed', mb: 2 }} />
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box
                  sx={{
                    background: '#1F2329',
                    border: '1px solid #d0d0d0',
                    borderRadius: '5px',
                    px: 2,
                    py: 0.5,
                    fontSize: '12px',
                    color: '#fff',
                    fontWeight: 400,
                  }}
                >
                  {getPlatformLabel(space.platform)}
                </Box>
                <IconButton
                  size="small"
                  onClick={e => onMenuClick(e, space)}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          </Box>
        ))}
        {spaces.length === 0 && (
          <Card sx={{ textAlign: 'center', py: 8, boxShadow: 'none' }}>
            <Typography variant="body2" color="text.secondary">
              暂无知识库，点击右上角按钮创建
            </Typography>
          </Card>
        )}
      </Stack>
    </Card>
  );
};

