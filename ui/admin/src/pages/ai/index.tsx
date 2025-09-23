import {
  deleteAdminKbKbId,
  getAdminKb,
  postAdminKb,
  putAdminKbKbId,
  SvcKBCreateReq,
  SvcKBListItem,
} from '@/api';
import Card from '@/components/card';
import { message, Modal } from '@c-x/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import {
  Box,
  Button,
  Divider,
  Grid2 as Grid,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { Icon, Message } from 'ct-mui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import z from 'zod';
import Model from '../settings/component/Model';
import Bot from './bot';

const schema = z.object({
  name: z.string().min(1, '必填').default(''),
  desc: z.string().default(''),
});

const AdminDocument = () => {
  const navigator = useNavigate();
  const { data, refresh } = useRequest(getAdminKb);
  const kbData = data?.items?.[0] as SvcKBListItem;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const clickOption = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  const closeOption = () => {
    setAnchorEl(null);
  };
  const deleteKb = (item: SvcKBListItem) => {
    closeOption();
    Modal.confirm({
      title: '提示',
      okText: '删除',
      okButtonProps: {
        color: 'error',
      },
      content: (
        <>
          确定要删除
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {item.name}
          </Box>{' '}
          吗？
        </>
      ),
      onOk: () => {
        deleteAdminKbKbId(item.id || 0).then(() => {
          message.success('删除成功');
          refresh();
        });
      },
    });
  };

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<SvcKBListItem | null>(null);
  const { register, formState, handleSubmit, reset } = useForm({
    resolver: zodResolver(schema),
  });
  const creatRepo = () => {
    setShowCreate(true);
  };
  const handleCancel = () => {
    setShowCreate(false);
    setEditItem(null);
    reset(schema.parse({}));
  };
  const handleEdit = (item: SvcKBListItem) => {
    setEditItem(item);
    setShowCreate(true);
    reset(item);
    closeOption();
  };
  const isPut = !!editItem;
  const handleOk = (data: SvcKBCreateReq) => {
    const reqHandle = isPut
      ? (query: SvcKBCreateReq) => putAdminKbKbId(editItem.id || 0, query)
      : postAdminKb;
    reqHandle(data).then(() => {
      handleCancel();
      Message.success(isPut ? '修改成功' : '创建成功');
      refresh();
    });
  };
  const toDetail = (item: SvcKBListItem) => {
    navigator(`/admin/ai/${item.id}/qa?name=${item.name}`);
  };

  return (
    <Card sx={{ flex: 1, height: '100%', overflow: 'auto' }}>
      <Grid container spacing={2}>
        <Grid size={{ sm: 12, md: 6 }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              知识学习
            </Typography>
            {/* 替换原有的知识学习模块内容 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 问答对 */}
              <Card
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#F8F9FA',
                  cursor: 'pointer',
                }}
                onClick={() => navigator(`/admin/ai/qa?id=${kbData?.id}`)}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ py: 1 }}
                >
                  <Stack>
                    <Typography variant="subtitle2">问答对</Typography>
                    <Typography variant="caption" color="text.secondary">
                      用于配置可直接命中的标准答案，解决常见高频问题
                    </Typography>
                  </Stack>
                  <Typography variant="subtitle2" color="text.primary">
                    {kbData?.qa_count || 0} 个问题
                  </Typography>
                </Stack>
              </Card>

              {/* 在线网页 */}
              <Card
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#F8F9FA',
                  cursor: 'pointer',
                }}
                onClick={() => navigator(`/admin/ai/web?id=${kbData?.id}`)}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ py: 1 }}
                >
                  <Stack>
                    <Typography variant="subtitle2">在线网页</Typography>
                    <Typography variant="caption" color="text.secondary">
                      通过指定URL、Sitemap等方式自动抓取网页内容进行学习
                    </Typography>
                  </Stack>
                  <Typography variant="subtitle2" color="text.primary">
                    {kbData?.web_count || 0} 个网页
                  </Typography>
                </Stack>
              </Card>

              {/* 通用文档 */}
              <Card
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#F8F9FA',
                  cursor: 'pointer',
                }}
                onClick={() => navigator(`/admin/ai/doc?id=${kbData?.id}`)}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ py: 1 }}
                >
                  <Stack>
                    <Typography variant="subtitle2">通用文档</Typography>
                    <Typography variant="caption" color="text.secondary">
                      通过上传离线文档等方式导入内容进行学习
                    </Typography>
                  </Stack>
                  <Typography variant="subtitle2" color="text.primary">
                    {kbData?.doc_count || 0} 个文档
                  </Typography>
                </Stack>
              </Card>

              {/* 知识库 */}
              <Card
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#F8F9FA',
                  cursor: 'pointer',
                }}
                onClick={() => navigator(`/admin/ai/kb?id=${kbData?.id}`)}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ py: 1 }}
                >
                  <Stack>
                    <Typography variant="subtitle2">知识库</Typography>
                    <Typography variant="caption" color="text.secondary">
                      关联Pandawki、飞书等第三方知识库
                    </Typography>
                  </Stack>
                  <Typography variant="subtitle2" color="text.primary">
                    {kbData?.space_count || 0} 个知识库
                  </Typography>
                </Stack>
              </Card>
            </div>
            {/* 移除原有的创建按钮 */}
          </Card>
        </Grid>
        <Grid size={{ sm: 12, md: 6 }}>
          <Bot />
          <Card sx={{ border: '1px solid', borderColor: 'divider', mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 0 }}>
              模型管理
            </Typography>
            <Model />
          </Card>
        </Grid>
      </Grid>
      <Modal
        open={showCreate}
        onCancel={handleCancel}
        title={isPut ? '修改空间' : '创建空间'}
        onOk={handleSubmit(handleOk)}
      >
        <Stack spacing={2}>
          <TextField
            {...register('name')}
            label="名称"
            fullWidth
            error={Boolean(formState.errors.name?.message)}
            helperText={formState.errors.name?.message}
          />
          <TextField fullWidth {...register('desc')} label="描述" multiline minRows={3} />
        </Stack>
      </Modal>
    </Card>
  );
};

export default AdminDocument;
