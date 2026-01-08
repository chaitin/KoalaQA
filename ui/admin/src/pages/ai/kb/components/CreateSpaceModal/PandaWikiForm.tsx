import { Stack, TextField } from '@mui/material';
import { UseFormReturn } from 'react-hook-form';
import { getPlatformLabel } from '../../utils';
import { PlatformPlatformType } from '@/api';

interface PandaWikiFormProps {
  form: UseFormReturn<any>;
  selectedPlatform: number;
}

export const PandaWikiForm = ({ form, selectedPlatform }: PandaWikiFormProps) => {
  const { register, formState } = form;

  return (
    <Stack spacing={3}>
      <TextField
        {...register('title')}
        label="标题"
        fullWidth
        placeholder="请输入知识库标题"
        error={Boolean(formState.errors.title?.message)}
        helperText={formState.errors.title?.message}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        {...register('url')}
        label={`${getPlatformLabel(selectedPlatform)} 后台地址`}
        fullWidth
        placeholder={
          selectedPlatform === 9
            ? 'https://your-pandawiki.com'
            : selectedPlatform === PlatformPlatformType.PlatformDingtalk
              ? 'https://your-dingtalk.com'
              : 'https://your-feishu.com'
        }
        error={Boolean(formState.errors.url?.message)}
        helperText={formState.errors.url?.message}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        {...register('access_token')}
        label="API Token"
        fullWidth
        placeholder="请输入 API Token"
        error={Boolean(formState.errors.access_token?.message)}
        helperText={formState.errors.access_token?.message}
        InputLabelProps={{ shrink: true }}
      />
    </Stack>
  );
};

