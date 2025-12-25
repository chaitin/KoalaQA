import { getAdminSystemBrand, putAdminSystemBrand } from '@/api';
import Card from '@/components/card';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Avatar,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CloseIcon from '@mui/icons-material/Close';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { message } from '@ctzhian/ui';

// 配色方案类型
type ThemeColorScheme = 'deep-blue' | 'blue' | 'green'; // 'orange' | 'pink' | 'dark-purple';

// 配色方案配置
const themeColorSchemes: Record<
  ThemeColorScheme,
  {
    name: string;
    primaryColor: string;
    previewColors: { header: string; sidebar: string; content: string };
  }
> = {
  'deep-blue': {
    name: '深蓝风格',
    primaryColor: '#006397',
    previewColors: {
      header: '#006397',
      sidebar: '#1a1a1a',
      content: '#ffffff',
    },
  },
  blue: {
    name: '蓝色风格',
    primaryColor: '#3248F2',
    previewColors: {
      header: '#3248F2',
      sidebar: '#f5f5f5',
      content: '#ffffff',
    },
  },
  green: {
    name: '绿色风格',
    primaryColor: '#27AE60',
    previewColors: {
      header: '#27AE60',
      sidebar: '#f5f5f5',
      content: '#ffffff',
    },
  },
  // 'orange': {
  //   name: '橙色风格',
  //   primaryColor: '#FFA500',
  //   previewColors: {
  //     header: '#FFA500',
  //     sidebar: '#f5f5f5',
  //     content: '#ffffff',
  //   },
  // },
  // 'pink': {
  //   name: '粉红风格',
  //   primaryColor: '#E91E63',
  //   previewColors: {
  //     header: '#E91E63',
  //     sidebar: '#f5f5f5',
  //     content: '#ffffff',
  //   },
  // },
  // 'dark-purple': {
  //   name: '暗夜紫风格',
  //   primaryColor: '#7B2CBF',
  //   previewColors: {
  //     header: '#7B2CBF',
  //     sidebar: '#1a1a1a',
  //     content: '#2a2a2a',
  //   },
  // },
};

// 将文件转换为 base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // 保留完整的 data URL 格式，包含 MIME 类型信息
      resolve(result);
    };
    reader.onerror = error => reject(error);
  });
};

const formSchema = z.object({
  logo: z.union([
    z.string(),
    z.instanceof(File).refine(
      file => file.size <= 1024 * 1024, // 1MB = 1024 * 1024 bytes
      '文件大小不能超过1MB'
    ),
  ]),
  text: z.string().min(1, '品牌文字不能为空').max(50, '品牌文字不能超过50个字符'),
});

type FormData = z.infer<typeof formSchema>;

const Logo: React.FC = () => {
  const [themeColorScheme, setThemeColorScheme] = useState<ThemeColorScheme>('deep-blue');
  const [openThemeDialog, setOpenThemeDialog] = useState(false);
  const [tempSelectedTheme, setTempSelectedTheme] = useState<ThemeColorScheme>('deep-blue');

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isDirty, dirtyFields },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      logo: '',
      text: '',
    },
  });

  // 打开配色选择对话框
  const handleOpenThemeDialog = () => {
    setTempSelectedTheme(themeColorScheme);
    setOpenThemeDialog(true);
  };

  // 关闭配色选择对话框
  const handleCloseThemeDialog = () => {
    setOpenThemeDialog(false);
  };

  // 确认选择配色方案
  const handleConfirmTheme = () => {
    setThemeColorScheme(tempSelectedTheme);
    setOpenThemeDialog(false);
    
    // TODO: 这里可以调用 API 保存配色方案
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (!dirtyFields.logo) {
        // 没有上传新 logo，只更新文字
        await putAdminSystemBrand({
          text: data.text,
        });
      } else {
        // 上传了新 logo，需要转换为 base64
        let logoBase64 = '';
        if (data.logo instanceof File) {
          logoBase64 = await fileToBase64(data.logo);
        } else if (typeof data.logo === 'string') {
          logoBase64 = data.logo;
        }

        await putAdminSystemBrand({
          logo: logoBase64,
          text: data.text,
        });
      }
      message.success('保存成功');
      reset(data);
    } catch (error) {
      message.error('保存失败，请重试');
      console.error('保存品牌配置失败:', error);
    }
  };

  useEffect(() => {
    getAdminSystemBrand().then(res => {
      reset(res);
    });
  }, [reset]);

  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant="subtitle2">品牌自定义</Typography>
        {/* 操作按钮 */}
        {isDirty && (
          <Stack direction="row" justifyContent="end" sx={{ gap: 2, my: '-8px' }}>
            <Button
              onClick={() => {
                reset();
              }}
              variant="outlined"
              sx={{ borderRadius: '6px' }}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              variant="contained"
              sx={{ borderRadius: '6px' }}
            >
              保存
            </Button>
          </Stack>
        )}
      </Stack>

      <Box sx={{ p: 2 }}>
        {/* 头像上传区域 */}
        <Stack direction="row" sx={{ mb: 2 }} alignItems="center">
          <Typography variant="subtitle2" sx={{ minWidth: '24%' }}>
            Logo
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Controller
              name="logo"
              control={control}
              render={({ field }) => (
                <Avatar
                  alt={'Logo'}
                  variant="square"
                  src={
                    typeof field.value === 'string'
                      ? field.value
                      : field.value
                        ? URL.createObjectURL(field.value)
                        : ''
                  }
                  sx={{
                    width: 78,
                    height: 78,
                    borderRadius: '4px',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 0.8,
                      borderColor: 'primary.main',
                    },
                  }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = e => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files.length > 0) {
                        const file = files[0];
                        // 检查文件大小
                        if (file.size > 1024 * 1024) {
                          message.error('文件大小不能超过1MB');
                          return;
                        }
                        field.onChange(file);
                      }
                    };
                    input.click();
                  }}
                >
                  {!field.value && (
                    <Stack sx={{ color: 'text.secondary' }} alignItems="center">
                      <FileUploadIcon />
                      <Typography variant="caption">点击上传</Typography>
                    </Stack>
                  )}
                </Avatar>
              )}
            />
          </Box>
        </Stack>

        {/* 名称输入区域 */}
        <Stack direction="row" sx={{ mb: 2 }} alignItems="center">
          <Stack direction="row" sx={{ minWidth: '24%' }}>
            <Typography
              variant="subtitle2"
              sx={{ minWidth: '24%', '&:last-letter': { color: 'error.main' } }}
            >
              Logo 文字
            </Typography>
            <Typography variant="subtitle2" sx={{ minWidth: '24%', color: 'error.main' }}>
              *
            </Typography>
          </Stack>

          <TextField
            {...register('text')}
            placeholder="请输入品牌文字"
            fullWidth
            error={!!errors.text}
            helperText={errors.text?.message}
            slotProps={{
              inputLabel: {
                shrink: !!watch('text') || undefined,
                sx: { display: 'none' },
              },
            }}
          />
        </Stack>

        {/* 主题配色区域 */}
        {/* <Stack direction="row" sx={{ mb: 2 }} alignItems="center">
          <Typography variant="subtitle2" sx={{ minWidth: '24%' }}>
            主题配色
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {themeColorSchemes[themeColorScheme].name}
            </Typography>
            <Button variant="outlined" onClick={handleOpenThemeDialog} sx={{ borderRadius: '6px' }}>
              定制社区配色
            </Button>
          </Box>
        </Stack> */}
      </Box>

      {/* 配色选择对话框 */}
      <Dialog
        open={openThemeDialog}
        onClose={handleCloseThemeDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6">自定义配色</Typography>
          <IconButton onClick={handleCloseThemeDialog} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 2,
              py: 3,
            }}
          >
            {(Object.keys(themeColorSchemes) as ThemeColorScheme[]).map(schemeKey => {
              const scheme = themeColorSchemes[schemeKey];
              const isSelected = tempSelectedTheme === schemeKey;
              return (
                <Box
                  key={schemeKey}
                  onClick={() => setTempSelectedTheme(schemeKey)}
                  sx={{
                    cursor: 'pointer',
                    border: isSelected ? '2px solid' : '1px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                      boxShadow: 2,
                    },
                  }}
                >
                  {/* 预览区域 */}
                  <Box
                    sx={{
                      height: 80,
                      position: 'relative',
                      background: `linear-gradient(135deg, ${scheme.previewColors.header} 0%, ${scheme.previewColors.sidebar} 100%)`,
                    }}
                  >
                    {/* 模拟头部 */}
                    <Box
                      sx={{
                        height: '30%',
                        bgcolor: scheme.previewColors.header,
                        display: 'flex',
                        alignItems: 'center',
                        px: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: scheme.previewColors.content,
                          opacity: 0.3,
                          mr: 0.5,
                        }}
                      />
                      <Box
                        sx={{
                          width: 20,
                          height: 4,
                          borderRadius: '2px',
                          bgcolor: scheme.previewColors.content,
                          opacity: 0.3,
                        }}
                      />
                    </Box>
                    {/* 模拟内容区域 */}
                    <Box
                      sx={{
                        height: '70%',
                        bgcolor: scheme.previewColors.content,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          bgcolor: scheme.previewColors.header,
                          opacity: 0.5,
                        }}
                      />
                      <Box
                        sx={{
                          width: 12,
                          height: 4,
                          borderRadius: '2px',
                          bgcolor: scheme.previewColors.header,
                          opacity: 0.3,
                        }}
                      />
                    </Box>
                  </Box>
                  {/* 标签 */}
                  <Box
                    sx={{
                      p: 1,
                      textAlign: 'center',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'text.primary' }}>
                      {scheme.name}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* 操作按钮 */}
          <Stack
            direction="row"
            justifyContent="flex-end"
            spacing={2}
            sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}
          >
            <Button
              onClick={handleCloseThemeDialog}
              variant="outlined"
              sx={{ borderRadius: '6px' }}
            >
              取消
            </Button>
            <Button onClick={handleConfirmTheme} variant="contained" sx={{ borderRadius: '6px' }}>
              确定
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Logo;
