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
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CloseIcon from '@mui/icons-material/Close';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { message, Modal } from '@ctzhian/ui';
import deepBlue from '@/assets/images/deep_blue.png';
import blue from '@/assets/images/blue.png';
import green from '@/assets/images/green.png';

// 配色方案类型
type ThemeColorScheme = '#006397' | '#006FFF' | '#50A892'; // 'orange' | 'pink' | 'dark-purple';

// 配色方案配置
const themeColorSchemes: Record<
  ThemeColorScheme,
  {
    name: string;
    primaryColor: string;
    previewColors: { header: string; sidebar: string; content: string };
    img: string;
  }
> = {
  '#006397': {
    name: '深蓝风格',
    primaryColor: '#006397',
    previewColors: {
      header: '#006397',
      sidebar: '#1a1a1a',
      content: '#ffffff',
    },
    img: deepBlue,
  },
  '#006FFF': {
    name: '蓝色风格',
    primaryColor: '#006FFF',
    previewColors: {
      header: '#006FFF',
      sidebar: '#f5f5f5',
      content: '#ffffff',
    },
    img: blue,
  },
  '#50A892': {
    name: '绿色风格',
    primaryColor: '#50A892',
    previewColors: {
      header: '#50A892',
      sidebar: '#f5f5f5',
      content: '#ffffff',
    },
    img: green,
  },
  // 'orange': {
  //   name: '橙色风格',
  //   primaryColor: '#FE662A',
  //   previewColors: {
  //     header: '#FE662A',
  //     sidebar: '#f5f5f5',
  //     content: '#ffffff',
  //   },
  // },
  // 'pink': {
  //   name: '粉红风格',
  //   primaryColor: '#EA4C89',
  //   previewColors: {
  //     header: '#EA4C89',
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
  theme: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const Logo: React.FC = () => {
  const [themeColorScheme, setThemeColorScheme] = useState<ThemeColorScheme>('#006397');
  const [openThemeDialog, setOpenThemeDialog] = useState(false);
  const [tempSelectedTheme, setTempSelectedTheme] = useState<ThemeColorScheme>('#006397');

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    formState: { errors, isDirty, dirtyFields },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      logo: '',
      text: '',
      theme: '#006397',
    },
  });

  // 打开配色选择对话框
  const handleOpenThemeDialog = () => {
    const currentTheme = getValues('theme') as ThemeColorScheme;
    setTempSelectedTheme(currentTheme || themeColorScheme);
    setOpenThemeDialog(true);
  };

  // 关闭配色选择对话框
  const handleCloseThemeDialog = () => {
    setOpenThemeDialog(false);
  };

  // 确认选择配色方案
  const handleConfirmTheme = () => {
    setThemeColorScheme(tempSelectedTheme);
    setValue('theme', tempSelectedTheme, { shouldDirty: true });
    setOpenThemeDialog(false);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const updateData: { logo?: string; text: string; theme?: string } = {
        text: data.text,
      };

      // 如果主题色有变化，添加到更新数据中
      if (dirtyFields.theme && data.theme) {
        updateData.theme = data.theme;
      }

      if (!dirtyFields.logo) {
        // 没有上传新 logo，只更新文字和主题
        await putAdminSystemBrand(updateData);
      } else {
        // 上传了新 logo，需要转换为 base64
        let logoBase64 = '';
        if (data.logo instanceof File) {
          logoBase64 = await fileToBase64(data.logo);
        } else if (typeof data.logo === 'string') {
          logoBase64 = data.logo;
        }

        await putAdminSystemBrand({
          ...updateData,
          logo: logoBase64,
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
      // 同步主题色状态
      if (
        res.theme &&
        (Object.keys(themeColorSchemes) as ThemeColorScheme[]).includes(
          res.theme as ThemeColorScheme
        )
      ) {
        setThemeColorScheme(res.theme as ThemeColorScheme);
      }
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
          />
        </Stack>

        {/* 主题配色区域 */}
        <Stack direction="row" sx={{ mb: 2 }} alignItems="center">
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
        </Stack>
      </Box>

      {/* 配色选择对话框 */}
      <Modal
        open={openThemeDialog}
        onClose={handleCloseThemeDialog}
        onCancel={handleCloseThemeDialog}
        onOk={handleConfirmTheme}
        width={700}
        title="自定义配色"
      >
        <Stack direction="row" spacing={2}>
          {(Object.keys(themeColorSchemes) as ThemeColorScheme[]).map(schemeKey => {
            const scheme = themeColorSchemes[schemeKey];
            const isSelected = tempSelectedTheme === schemeKey;
            return (
              <Box
                key={schemeKey}
                onClick={() => setTempSelectedTheme(schemeKey)}
                sx={{
                  cursor: 'pointer',
                  border: isSelected ? '1px solid' : '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  position: 'relative',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                  },
                }}
              >
                <img src={scheme.img} alt={scheme.name} />
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    position: 'absolute',
                    bottom: '4px',
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                  }}
                >
                  {scheme.name}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </Modal>
    </Card>
  );
};

export default Logo;
