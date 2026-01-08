import { Stack, TextField, Tabs, Tab, Box, Typography } from '@mui/material';
import { UseFormReturn } from 'react-hook-form';
import dingtalk_screen_1 from '@/assets/images/dingtalk_1.png';
import dingtalk_screen_2 from '@/assets/images/dingtalk_2.png';

interface DingtalkFormProps {
  form: UseFormReturn<any>;
  step: number;
  editSpace: any;
  onImagePreview: (src: string, alt: string) => void;
}

export const DingtalkForm = ({ form, step, editSpace, onImagePreview }: DingtalkFormProps) => {
  const { register, formState, watch, setValue } = form;
  const identifierType = watch('identifier_type');

  if (step !== 2) {
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
        <Stack direction="row" spacing={2} alignItems="center">
          <Tabs
            value={identifierType}
            onChange={(_, value) => setValue('identifier_type', value as 'unionid' | 'phone')}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              p: '4px',
              border: '1px solid',
              borderColor: 'rgba(0, 0, 0, 0.23)',
              minHeight: 40,
              height: 40,
              backgroundColor: 'transparent',
              borderRadius: '4px',
              flexShrink: 0,
              '& .MuiTabs-indicator': {
                top: '50%',
                bottom: 'auto',
                transform: 'translateY(-50%)',
                height: 32,
                borderRadius: '4px',
                backgroundColor: '#1F2329',
              },
            }}
          >
            <Tab
              value="unionid"
              label="unionid"
              sx={{
                zIndex: 1,
                px: 2,
                py: 0.5,
                minHeight: 32,
                height: 32,
                minWidth: 0,
                fontSize: '14px',
                textTransform: 'none',
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: '#fff',
                },
              }}
            />
            <Tab
              value="phone"
              label="手机号"
              sx={{
                zIndex: 1,
                px: 2,
                py: 0.5,
                minHeight: 32,
                height: 32,
                minWidth: 0,
                fontSize: '14px',
                textTransform: 'none',
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: '#fff',
                },
              }}
            />
          </Tabs>
          {identifierType === 'unionid' ? (
            <TextField
              {...register('access_token')}
              label="unionid"
              fullWidth
              placeholder="请输入unionid"
              error={Boolean(formState.errors.access_token?.message)}
              helperText={formState.errors.access_token?.message}
              InputLabelProps={{ shrink: true }}
            />
          ) : (
            <TextField
              {...register('phone')}
              label="手机号"
              fullWidth
              placeholder="请输入手机号"
              error={Boolean(formState.errors.phone?.message)}
              helperText={formState.errors.phone?.message}
              InputLabelProps={{ shrink: true }}
            />
          )}
        </Stack>
      </Stack>
    );
  }

  // 第二步：配置指导
  return (
    <Stack spacing={3}>
      <Typography variant="h6" sx={{ textAlign: 'center', fontWeight: 600 }}>
        配置订阅事件
      </Typography>

      <Box
        sx={{
          display: 'flex',
          gap: 3,
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'flex-start',
        }}
      >
        {/* 步骤1 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" alignItems="flex-start" gap={1.5} sx={{ mb: 2, minHeight: 48 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: '4px',
                backgroundColor: '#1F2329',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              1
            </Box>
            <Typography variant="body2" sx={{ lineHeight: 1.6, flex: 1 }}>
              导航前往
              <Box component="span" sx={{ fontWeight: 600 }}>
                应用详情-开发配置-事件订阅
              </Box>
              ，选择{' '}
              <Box component="span" sx={{ fontWeight: 600 }}>
                Stream 模式推送
              </Box>
              ，点击按钮进行验证。
            </Typography>
          </Stack>
          <img
            src={dingtalk_screen_1}
            alt="钉钉配置步骤1"
            style={{
              maxWidth: '100%',
              height: 250,
              borderRadius: 8,
              cursor: 'pointer',
              objectFit: 'cover',
            }}
            onClick={() => onImagePreview(dingtalk_screen_1, '钉钉配置步骤1')}
          />
        </Box>

        {/* 步骤2 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" alignItems="flex-start" gap={1.5} sx={{ mb: 2, minHeight: 48 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: '4px',
                backgroundColor: '#1F2329',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              2
            </Box>
            <Typography variant="body2" sx={{ lineHeight: 1.6, flex: 1 }}>
              验证通过后，下方事件订阅启用
              <Box component="span" sx={{ fontWeight: 600 }}>
                钉钉文档导出完成事件
              </Box>
              。
            </Typography>
          </Stack>
          <img
            src={dingtalk_screen_2}
            alt="钉钉配置步骤2"
            style={{
              maxWidth: '100%',
              height: 250,
              borderRadius: 8,
              cursor: 'pointer',
              objectFit: 'cover',
            }}
            onClick={() => onImagePreview(dingtalk_screen_2, '钉钉配置步骤2')}
          />
        </Box>
      </Box>
    </Stack>
  );
};

