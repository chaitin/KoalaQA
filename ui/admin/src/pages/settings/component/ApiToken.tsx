import { deleteAdminTokenTokenId, getAdminToken, postAdminToken } from '@/api/ApiToken';
import { ModelAPIToken, ModelUserRole } from '@/api/types';
import Card from '@/components/card';
import { useAuthContext } from '@/hooks/context';
import { Icon, message, Modal } from '@ctzhian/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import LaunchIcon from '@mui/icons-material/Launch';
import {
    Box,
    Button,
    IconButton,
    Link,
    Stack,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import copy from 'copy-to-clipboard';

const apiTokenSchema = z.object({
    name: z.string().min(1, '请输入 Token 备注').default(''),
});

const maskToken = (token?: string) => {
    if (!token) return '';
    if (token.length <= 10) return '********';
    return `${token.slice(0, 6)}********${token.slice(-4)}`;
};

const ApiToken = () => {
    const [user] = useAuthContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [data, setData] = useState<ModelAPIToken[]>([]);

    const fetchData = async () => {
        try {
            const res = await getAdminToken();
            if (res.items) {
                setData(res.items);
            } else {
                setData([]);
            }
        } catch (e) {
            message.error('获取 API Token 列表失败');
        } finally {
        }
    };

    useEffect(() => {
        if (user && user.role === ModelUserRole.UserRoleAdmin) {
            fetchData();
        }
    }, [user]);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(apiTokenSchema),
        defaultValues: {
            name: '',
        },
    });

    const handleAdd = () => {
        reset({
            name: '',
        });
        setIsModalOpen(true);
    };

    const onSubmit = async (formData: any) => {
        try {
            await postAdminToken({ name: formData.name });
            message.success('创建成功');
            setIsModalOpen(false);
            fetchData();
        } catch (e) {
            message.error('创建失败');
        } finally {
        }
    };

    const handleDelete = (item: ModelAPIToken) => {
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除 Token "${item.name}" 吗？删除后将无法恢复。`,
            onOk: async () => {
                try {
                    if (item.id !== undefined) {
                        await deleteAdminTokenTokenId({ tokenId: item.id.toString() });
                        message.success('删除成功');
                        fetchData();
                    }
                } catch {
                    message.error('删除失败');
                }
            },
        });
    };

    const handleCopy = (text: string) => {
        copy(text);
        message.success('复制成功');
    };

    return (
        <Card sx={{ mt: 2 }}>
            <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="subtitle2" sx={{ mb: 0 }}>
                            API Token
                        </Typography>
                        <Link
                            sx={{ color: 'info.main', cursor: 'pointer', fontSize: '14px' }}
                            href="https://koalaqa.docs.baizhi.cloud/node/019cae08-61ed-764f-95c9-d46e732a1e49"
                            target="_blank"
                        >
                            文档
                            <LaunchIcon sx={{ fontSize: 14, ml: 0.5 }} />
                        </Link>
                    </Stack>
                    <Button variant="text" color="info" onClick={handleAdd}>
                        创建 API Token
                    </Button>
                </Stack>

                <Stack spacing={2}>
                    {data.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                暂无 API Token 数据显示
                            </Typography>
                        </Box>
                    ) : (
                        data.map(item => (
                            <Box
                                key={item.id}
                                sx={{
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 1,
                                    p: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Tooltip title={item.name}>
                                    <Typography
                                        variant="body2"
                                        title={item.name}
                                        sx={{
                                            width: '20%',
                                            fontWeight: 'bold',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {item.name}
                                    </Typography>
                                </Tooltip>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '50%', }}>
                                    <Typography variant="body2" sx={{ color: 'text.primary', fontFamily: 'Mono' }}>
                                        {maskToken(item.token)}
                                    </Typography>
                                    <IconButton size="small" onClick={() => item.token && handleCopy(item.token)}>
                                        <Icon type="icon-fuzhi1" sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Box>
                                <IconButton size="small" onClick={() => handleDelete(item)}>
                                    <Icon type="icon-guanbi-fill" sx={{ flexShrink: 0, color: 'text.tertiary' }} />
                                </IconButton>
                            </Box>
                        ))
                    )}
                </Stack>

                <Modal
                    open={isModalOpen}
                    title="创建 API Token"
                    onCancel={() => setIsModalOpen(false)}
                    onOk={handleSubmit(onSubmit)}
                >
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <Box>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                API Token 备注 <span style={{ color: 'red' }}>*</span>
                            </Typography>
                            <TextField
                                fullWidth
                                error={!!errors.name}
                                helperText={errors.name?.message}
                                placeholder="请输入"
                                {...register('name')}
                            />
                        </Box>
                    </Stack>
                </Modal>
            </Stack>
        </Card >
    );
};

export default ApiToken;
