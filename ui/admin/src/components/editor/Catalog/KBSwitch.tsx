import { Stack, Popover, Box, Divider, MenuItem, Typography } from '@mui/material';
import { useState } from 'react';
import { KnowledgeBase } from '../index';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

interface KBSwitchProps {
  kbList: KnowledgeBase[];
  currentKbId: string;
  onKbChange?: (kbId: string) => void;
}

const KBSwitch = ({ kbList, currentKbId, onKbChange }: KBSwitchProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (kbList.length > 1) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const handleKbSelect = (kbId: string) => {
    onKbChange?.(kbId);
    handlePopoverClose();
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Stack
        aria-describedby="editor-kb-switch"
        alignItems="center"
        justifyContent="center"
        sx={{
          cursor: kbList.length > 1 ? 'pointer' : 'default',
          flexShrink: 0,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '10px',
          width: 36,
          height: 36,
          '&:hover':
            kbList.length > 1
              ? {
                  bgcolor: 'action.hover',
                }
              : {},
        }}
        onClick={handlePopoverOpen}
      >
        <AccountTreeIcon sx={{ color: 'text.primary', fontSize: 20 }} />
      </Stack>

      {kbList.length > 1 && (
        <Popover
          id="editor-kb-switch"
          open={open}
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          onClose={handlePopoverClose}
          disableAutoFocus
        >
          <Stack sx={{ width: 200, maxHeight: 300, overflowY: 'auto' }}>
            <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary">
                全部知识库
              </Typography>
            </Box>
            <Divider />
            <Stack sx={{ p: 0.5 }}>
              {kbList.map(item => (
                <MenuItem
                  key={item.id}
                  selected={item.id === currentKbId}
                  onClick={() => handleKbSelect(item.id)}
                  sx={{
                    borderRadius: 1,
                    mx: 0.5,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    },
                  }}
                >
                  <Stack>
                    <Typography variant="body2" fontWeight="medium">
                      {item.name}
                    </Typography>
                    {item.description && (
                      <Typography variant="caption" color="text.secondary">
                        {item.description}
                      </Typography>
                    )}
                  </Stack>
                </MenuItem>
              ))}
            </Stack>
          </Stack>
        </Popover>
      )}
    </>
  );
};

export default KBSwitch;
