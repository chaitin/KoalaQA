import {
  deleteAdminSystemWebhookWebhookId,
  getAdminSystemWebhook,
  ModelWebhook,
  postAdminSystemWebhook,
  putAdminSystemWebhookWebhookId,
  SvcWebhookCreateReq,
  SvcWebhookUpdateReq,
} from '@/api';
import ClearIcon from '@mui/icons-material/Clear';
import Card from '@/components/card';
import { Ellipsis, message, Modal, Table } from '@ctzhian/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { ColumnsType } from '@ctzhian/ui/dist/Table';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const notificationTypes = [{ value: 1, label: '钉钉机器人' }];

const contentOptions = [
  { value: 1, label: '点踩 AI 的回答' },
  { value: 2, label: 'AI 无法解答问题' },
  // { value: "new_feedback", label: "有新的反馈" },
  // { value: "new_reply", label: "点赞 AI 的回答" },
  // { value: "new_comment", label: "有新的反馈" },
];

// 定义表单验证 schema
const webhookSchema = z.object({
  name: z.string().min(1, '请输入通知名称').default(''),
  url: z.url('请输入有效的URL地址').min(1, '请输入URL地址'),
  sign: z.string().optional().default(''), // 加签密钥可选
  type: z.number().default(1),
  msg_types: z.array(z.number()).min(1, '请至少选择一项通知内容'),
});

const Notification = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ModelWebhook | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(webhookSchema),
  });

  const {
    data,
    loading,
    run: fetchData,
  } = useRequest(getAdminSystemWebhook, {
    manual: true,
  });

  const columns: ColumnsType<ModelWebhook> = [
    {
      title: '通知名称',
      dataIndex: 'name',
      render: text => <Ellipsis>{text}</Ellipsis>,
    },
    {
      title: '通知方式',
      dataIndex: 'type',
      render: text => notificationTypes.find(t => t.value === text)?.label || text,
    },
    {
      title: '操作',
      width: 160,
      dataIndex: 'opt',
      render: (_, record) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" color="primary" onClick={() => handleEdit(record)}>
            修改
          </Button>
          <Button variant="text" size="small" color="error" onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Stack>
      ),
    },
  ];

  const handleAdd = () => {
    setEditItem(null);
    reset({
      name: '',
      url: '',
      sign: '',
      type: 1,
      msg_types: [],
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: ModelWebhook) => {
    setEditItem(item);
    reset(item);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ModelWebhook) => {
    try {
      if (editItem) {
        await putAdminSystemWebhookWebhookId(editItem.id!, data as SvcWebhookUpdateReq);
      } else {
        await postAdminSystemWebhook(data as SvcWebhookCreateReq);
      }
      message.success(editItem ? '修改成功' : '添加成功');
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      message.error(editItem ? '修改失败' : '添加失败');
    }
  };

  const handleDelete = (item: ModelWebhook) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除通知 "${item.name}" 吗？`,
      onOk: async () => {
        try {
          await deleteAdminSystemWebhookWebhookId(item.id!);
          message.success('删除成功');
          fetchData();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Card sx={{ mt: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 14 }}>通知管理</Typography>
          <Button variant="contained" color="primary" onClick={handleAdd}>
            新增一个通知
          </Button>
        </Stack>

        <Table
          loading={loading}
          columns={columns}
          dataSource={data?.items || []}
          pagination={false}
        />

        <Modal
          open={isModalOpen}
          title="通知"
          onCancel={() => setIsModalOpen(false)}
          onOk={handleSubmit(onSubmit, e => {
            console.log(e);
          })}
        >
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="通知名称"
              error={!!errors.name}
              helperText={errors.name?.message}
              required
              {...register('name')}
            />
            <Box>
              <FormControl fullWidth error={!!errors.type}>
                <InputLabel id="notification-type-label">通知方式</InputLabel>
                <Select
                  labelId="notification-type-label"
                  id="notification-type"
                  value={watch('type') ?? 1}
                  label="通知方式"
                  onChange={e =>
                    setValue('type', Number((e.target as HTMLInputElement).value), {
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                  }
                >
                  <MenuItem value={1}>钉钉机器人</MenuItem>
                </Select>
                {errors.type && <FormHelperText>{errors.type?.message}</FormHelperText>}
              </FormControl>
            </Box>
            <TextField
              fullWidth
              required
              label="Webhook地址"
              error={!!errors.url} // 修改这里
              helperText={errors.url?.message} // 修改这里
              {...register('url')} // 修改这里
            />

            <TextField
              fullWidth
              label="加签密钥（可选）"
              error={!!errors.sign}
              helperText={errors.sign?.message}
              {...register('sign')}
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                通知内容
              </Typography>
              <FormGroup sx={{ width: '100%' }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 1,
                  }}
                >
                  {contentOptions.map(option => (
                    <FormControlLabel
                      key={option.value}
                      control={
                        <Checkbox
                          checked={(watch('msg_types') || []).includes(option.value)}
                          onChange={e => {
                            const currentTypes = watch('msg_types') || [];
                            const newTypes = e.target.checked
                              ? [...currentTypes, option.value]
                              : currentTypes.filter(v => v !== option.value);
                            setValue('msg_types', newTypes, {
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }}
                        />
                      }
                      label={option.label}
                    />
                  ))}
                </Box>
              </FormGroup>
              {errors.msg_types && (
                <FormHelperText error>{errors.msg_types.message}</FormHelperText>
              )}
            </Box>
          </Stack>
        </Modal>
      </Stack>
    </Card>
  );
};

export default Notification;
