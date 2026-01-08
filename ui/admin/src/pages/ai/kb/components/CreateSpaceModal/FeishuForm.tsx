import {
  Stack,
  TextField,
  Divider,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Chip,
  Button,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import { UseFormReturn } from 'react-hook-form';
import { AdminDocUserRes } from '@/api/types';

interface FeishuFormProps {
  form: UseFormReturn<any>;
  feishuBoundUser: AdminDocUserRes | null;
  needsRebind: boolean;
  onBindFeishuAccount: () => void;
  onUnbindFeishuAccount: () => void;
}

export const FeishuForm = ({
  form,
  feishuBoundUser,
  needsRebind,
  onBindFeishuAccount,
  onUnbindFeishuAccount,
}: FeishuFormProps) => {
  const { register, formState, watch } = form;

  return (
    <Stack spacing={3}>
      <TextField
        {...register('title')}
        label="名称"
        fullWidth
        placeholder="请输入知识库名称"
        error={Boolean(formState.errors.title?.message)}
        helperText={formState.errors.title?.message}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        {...register('app_id')}
        label="Client ID"
        fullWidth
        placeholder="请输入 Client ID"
        error={Boolean(formState.errors.app_id?.message)}
        helperText={formState.errors.app_id?.message}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        {...register('secret')}
        label="Client Secret"
        fullWidth
        placeholder="请输入 Client Secret"
        error={Boolean(formState.errors.secret?.message)}
        helperText={formState.errors.secret?.message}
        InputLabelProps={{ shrink: true }}
      />

      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: 1 }}>
        绑定账号
      </Typography>
      {watch('user_third_id') ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            border: '1px solid',
            borderColor: needsRebind ? 'error.main' : 'divider',
            borderRadius: 1,
            bgcolor: needsRebind ? 'error.lighter' : 'grey.50',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: needsRebind ? 'error.main' : 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {watch('username')?.[0]?.toUpperCase() || 'U'}
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {watch('username') || '未知用户'}
            </Typography>
            <Chip
              label={needsRebind ? '信息已变更，请重新绑定' : '已绑定'}
              size="small"
              color={needsRebind ? 'error' : 'success'}
              sx={{
                height: 20,
                fontSize: '12px',
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          </Stack>
          <Tooltip title="解除绑定" arrow>
            <IconButton
              size="small"
              onClick={onUnbindFeishuAccount}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'error.main',
                  bgcolor: 'error.lighter',
                },
              }}
            >
              <CancelIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Button
          variant="outlined"
          onClick={onBindFeishuAccount}
          disabled={!watch('app_id') || !watch('secret')}
        >
          绑定账号
        </Button>
      )}
    </Stack>
  );
};

