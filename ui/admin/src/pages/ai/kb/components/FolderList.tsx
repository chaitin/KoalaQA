import { SvcListSpaceFolderItem } from '@/api';
import { Card, Icon } from '@ctzhian/ui';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FolderIcon from '@mui/icons-material/Folder';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import StatusBadge from '@/components/StatusBadge';
import { formatDate } from '../utils';

interface FolderListProps {
  folders: SvcListSpaceFolderItem[];
  selectedSpaceId: number | null;
  foldersLoading: boolean;
  onFolderClick: (folderId: number, folderTitle: string) => void;
  onFolderMenuClick: (
    event: React.MouseEvent<HTMLButtonElement>,
    folder: SvcListSpaceFolderItem
  ) => void;
}

export const FolderList = ({
  folders,
  selectedSpaceId,
  foldersLoading,
  onFolderClick,
  onFolderMenuClick,
}: FolderListProps) => {
  if (!selectedSpaceId) {
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'none' }}>
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <FolderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            请选择知识库
          </Typography>
          <Typography variant="body2" color="text.secondary">
            从左侧列表中选择一个知识库查看其文档
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'none' }}>
      <Typography variant="body1" sx={{ mb: 3, fontWeight: 500, fontSize: '16px' }}>
        知识库列表
      </Typography>

      <Stack spacing={2} sx={{ flex: 1, overflow: 'auto' }}>
        {folders.map(folder => (
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            key={folder.id}
            sx={{
              pl: 3,
              pr: 2,
              py: 2,
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: 'white',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: '#f8f9fa',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              },
            }}
          >
            <Icon
              type="icon-tongyongwendang-moren"
              sx={{ color: 'text.secondary', fontSize: 20, flexShrink: 0 }}
            />
            <Stack sx={{ width: '35%', minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 500,
                  fontSize: '14px',
                  mb: 0.5,
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                  '&:hover': { color: 'info.main' },
                }}
                onClick={() => onFolderClick(folder.id!, folder.title || '')}
              >
                {folder.title}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: '12px',
                    mb: 0.5,
                    '& b': { color: 'text.primary' },
                  }}
                >
                  同步成功 <b>{folder.success || 0}</b> 个
                  {(() => {
                    const syncing =
                      (folder.total || 0) - (folder.success || 0) - (folder.failed || 0);
                    return syncing > 0 ? (
                      <>
                        ，同步中 <b>{syncing}</b> 个
                      </>
                    ) : null;
                  })()}
                  {(folder.failed || 0) > 0 && (
                    <>
                      ，同步失败 <b>{folder.failed || 0}</b> 个
                    </>
                  )}
                </Typography>
              </Stack>
            </Stack>
            <Box sx={{ width: '100px', flexShrink: 0 }}>
              <StatusBadge status={folder.status} />
            </Box>
            <Box sx={{ flex: 1 }} />
            <Stack alignItems="flex-end" spacing={1} sx={{ flexShrink: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconButton
                  size="small"
                  onClick={e => onFolderMenuClick(e, folder)}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ pr: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: '12px', display: 'block' }}
                >
                  更新于 {dayjs((folder.updated_at || 0) * 1000).fromNow()}{' '}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: '12px', display: 'block' }}
                >
                  {formatDate(folder.updated_at)}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        ))}
        {folders.length === 0 && !foldersLoading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body2" color="text.secondary">
              该知识库暂无文档
            </Typography>
          </Box>
        )}
      </Stack>
    </Card>
  );
};
