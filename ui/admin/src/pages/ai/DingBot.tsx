import { getAdminChat, putAdminChat } from '@/api';
import Card from '@/components/card';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, FormControlLabel, Link, Stack, Switch, TextField, Typography } from '@mui/material';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { message } from '@ctzhian/ui';

const formSchema = z.object({
    client_id: z.string().min(1, '必填'),
    client_secret: z.string().min(1, '必填'),
    template_id: z.string().min(1, '必填'),
    enabled: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

const DingBot: React.FC = () => {
    const {
        register,
        handleSubmit,
        formState: { errors, isDirty },
        reset,
        watch,
        setValue,
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            client_id: '',
            client_secret: '',
            template_id: '',
            enabled: false,
        },
    });

    const enabled = watch('enabled');

    const onSubmit = async (data: FormData) => {
        try {
            await putAdminChat({
                config: {
                    client_id: data.client_id,
                    client_secret: data.client_secret,
                    template_id: data.template_id,
                },
                enabled: data.enabled,
            });
            message.success('保存成功');
            reset(data);
        } catch (e: any) {
            message.error(e.message || '保存失败');
        }
    };

    useEffect(() => {
        getAdminChat().then(res => {
            if (res) {
                reset({
                    client_id: res.config?.client_id || '',
                    client_secret: res.config?.client_secret || '',
                    template_id: res.config?.template_id || '',
                    enabled: res.enabled || false,
                });
            }
        });
    }, []);

    return (
        <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden', mt: 2 }}>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
            >
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    钉钉机器人
                </Typography>
                {/* 操作按钮 */}
                {isDirty && <Button
                    onClick={handleSubmit(onSubmit)}
                    variant="contained"
                    sx={{ borderRadius: '6px', bgcolor: '#24292f' }}
                    size="small"
                >
                    保存
                </Button>}
            </Stack>

            <Box sx={{ p: 2 }}>
                <Stack spacing={3}>
                    {/* Switch */}
                    <Stack direction="row" alignItems="center">
                        <Box sx={{ width: 120, flexShrink: 0 }}>
                            <Typography variant="body2">开启</Typography>
                        </Box>
                        <Switch
                            checked={enabled}
                            onChange={(e) => {
                                setValue('enabled', e.target.checked, { shouldDirty: true });
                            }}
                            size="small"
                            sx={{ mr: 'auto' }}
                        />
                        <Link href="https://login.dingtalk.com/oauth2/challenge.htm?redirect_uri=https%3A%2F%2Fopen-dev.dingtalk.com%2Fdingtalk_sso_call_back%3Fcontinue%3Dhttps%253A%252F%252Fopen-dev.dingtalk.com%252Ffe%252Fapp%253Fhash%253D%252523%25252Fcorp%25252Fapp&response_type=code&client_id=dingbakuoyxavyp5ruxw&scope=openid+corpid#/corp/app" target="_blank" underline="hover" sx={{ fontSize: '12px' }}>
                            使用方法
                        </Link>
                    </Stack>

                    {/* Client ID */}
                    <Stack direction="row" alignItems="flex-start">
                        <Box sx={{ width: 120, flexShrink: 0, pt: 1 }}>
                            <Stack direction="row">
                                <Typography variant="body2">Client ID</Typography>
                                <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
                            </Stack>
                        </Box>
                        <TextField
                            {...register('client_id')}
                            placeholder=""
                            fullWidth
                            size="small"
                            error={!!errors.client_id}
                            helperText={errors.client_id?.message}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
                        />
                    </Stack>

                    {/* Client Secret */}
                    <Stack direction="row" alignItems="flex-start">
                        <Box sx={{ width: 120, flexShrink: 0, pt: 1 }}>
                            <Stack direction="row">
                                <Typography variant="body2">Client Secret</Typography>
                                <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
                            </Stack>
                        </Box>
                        <TextField
                            {...register('client_secret')}
                            placeholder=""
                            fullWidth
                            size="small"
                            error={!!errors.client_secret}
                            helperText={errors.client_secret?.message}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
                        />
                    </Stack>

                    {/* Template ID */}
                    <Stack direction="row" alignItems="flex-start">
                        <Box sx={{ width: 120, flexShrink: 0, pt: 1 }}>
                            <Stack direction="row">
                                <Typography variant="body2">Template ID</Typography>
                                <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
                            </Stack>
                        </Box>
                        <TextField
                            {...register('template_id')}
                            placeholder="> 钉钉开发平台 > 卡片平台 > 模板列表 > 模板 ID"
                            fullWidth
                            size="small"
                            error={!!errors.template_id}
                            helperText={errors.template_id?.message}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
                        />
                    </Stack>
                </Stack>
            </Box>
        </Card>
    );
};

export default DingBot;
