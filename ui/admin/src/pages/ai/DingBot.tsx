import { getAdminChat, putAdminChat } from '@/api';
import Card from '@/components/card';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { message } from '@ctzhian/ui';

const formSchema = z.object({
    client_id: z.string().min(1, '必填'),
    client_secret: z.string().min(1, '必填'),
    template_id: z.string().min(1, '必填'),
});

type FormData = z.infer<typeof formSchema>;

const DingBot: React.FC = () => {
    const {
        register,
        handleSubmit,
        formState: { errors, isDirty },
        reset,
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            client_id: '',
            client_secret: '',
            template_id: '',
        },
    });

    const onSubmit = async (data: FormData) => {
        try {
            await putAdminChat({
                config: data,
                enabled: true,
            });
            message.success('保存成功');
            reset(data);
        } catch (e: any) {
            message.error(e.message || '保存失败');
        }
    };

    useEffect(() => {
        getAdminChat().then(res => {
            if (res && res.config) {
                reset({
                    client_id: res.config.client_id || '',
                    client_secret: res.config.client_secret || '',
                    template_id: res.config.template_id || '',
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
                {/* Client ID */}
                <Stack sx={{ mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Stack direction="row">
                            <Typography variant="body2">Client ID</Typography>
                            <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
                        </Stack>
                        <Link href="https://login.dingtalk.com/oauth2/challenge.htm?redirect_uri=https%3A%2F%2Fopen-dev.dingtalk.com%2Fdingtalk_sso_call_back%3Fcontinue%3Dhttps%253A%252F%252Fopen-dev.dingtalk.com%252Ffe%252Fapp%253Fhash%253D%252523%25252Fcorp%25252Fapp&response_type=code&client_id=dingbakuoyxavyp5ruxw&scope=openid+corpid#/corp/app" target="_blank" underline="hover" sx={{ fontSize: '12px' }}>
                            使用方法
                        </Link>
                    </Stack>
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
                <Stack sx={{ mb: 2 }}>
                    <Stack direction="row" sx={{ mb: 1 }}>
                        <Typography variant="body2">Client Secret</Typography>
                        <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
                    </Stack>
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
                <Stack sx={{ mb: 2 }}>
                    <Stack direction="row" sx={{ mb: 1 }}>
                        <Typography variant="body2">Template ID</Typography>
                        <Typography variant="body2" color="error.main" sx={{ ml: 0.5 }}>*</Typography>
                    </Stack>
                    <TextField
                        {...register('template_id')}
                        placeholder="&gt; 钉钉开发平台 &gt; 卡片平台 &gt; 模板列表 &gt; 模板 ID"
                        fullWidth
                        size="small"
                        error={!!errors.template_id}
                        helperText={errors.template_id?.message}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f6f8fa' } }}
                    />
                </Stack>
            </Box>
        </Card>
    );
};

export default DingBot;
