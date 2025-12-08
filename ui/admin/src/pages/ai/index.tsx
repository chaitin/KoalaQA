import { getAdminKb, postAdminKb, putAdminKbKbId, SvcKBCreateReq, SvcKBListItem } from '@/api';
import Card from '@/components/card';
import { Icon, message, Modal } from '@ctzhian/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  alpha,
  Box,
  CircularProgress,
  Grid,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import z from 'zod';
import Model from '../settings/component/Model';
import LaunchIcon from '@mui/icons-material/Launch';
import Bot from './bot';

const schema = z.object({
  name: z.string().min(1, '必填').default(''),
  desc: z.string().default(''),
});

const AdminDocument = () => {
  const navigator = useNavigate();
  const { data, loading, refresh } = useRequest(getAdminKb);
  const kbData = data?.items?.[0] as SvcKBListItem;
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<SvcKBListItem | null>(null);
  const { register, formState, handleSubmit, reset } = useForm({
    resolver: zodResolver(schema),
  });

  // 添加hover状态管理
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleCancel = () => {
    setShowCreate(false);
    setEditItem(null);
    reset(schema.parse({}));
  };

  const isPut = !!editItem;
  const handleOk = (data: SvcKBCreateReq) => {
    const reqHandle = isPut
      ? (query: SvcKBCreateReq) => putAdminKbKbId({ kbId: editItem.id || 0 }, query)
      : postAdminKb;
    reqHandle(data).then(() => {
      handleCancel();
      message.success(isPut ? '修改成功' : '创建成功');
      refresh();
    });
  };
  const knowledgeMenu = [
    {
      route: `/admin/ai/qa?id=${kbData?.id}`,
      title: '问答对',
      desc: '用于配置可直接命中的标准答案，解决常见高频问题',
      icon: 'icon-wendadui-moren',
      hoverIcon: 'icon-wendadui-xuanzhong',
      count: kbData?.qa_count || 0,
      subfix: '个问题',
    },
    {
      route: `/admin/ai/web?id=${kbData?.id}`,
      title: '在线网页',
      desc: '通过指定URL、Sitemap等方式自动抓取网页内容进行学习',
      icon: 'icon-zaixianwangye-moren',
      hoverIcon: 'icon-zaixianwangye-xuanzhong',
      count: kbData?.web_count || 0,
      subfix: '个网页',
    },
    {
      route: `/admin/ai/doc?id=${kbData?.id}`,
      title: '通用文档',
      desc: '通过上传离线文档等方式导入内容进行学习',
      icon: 'icon-tongyongwendang-moren',
      hoverIcon: 'icon-tongyongwendang-xuanzhong',
      count: kbData?.doc_count || 0,
      subfix: '个文档',
    },
    {
      route: `/admin/ai/kb?id=${kbData?.id}`,
      title: '知识库',
      desc: '关联Pandawki、飞书等第三方知识库',
      icon: 'icon-zhishiku-moren',
      hoverIcon: 'icon-zhishiku-xuanzhong',
      count: kbData?.space_count || 0,
      subfix: '个知识库',
    },
  ];
  return (
    <Card sx={{ flex: 1, height: '100%', overflow: 'auto' }}>
      <Grid container spacing={2}>
        <Grid size={{ sm: 12, md: 6 }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              知识学习
            </Typography>
            {/* 替换原有的知识学习模块内容 */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                  加载中...
                </Typography>
              </Box>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 问答对 */}
                {knowledgeMenu.map(item => (
                  <Card
                    key={item.title}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: '#F8F9FA',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: '#3860F4',
                      },
                    }}
                    onClick={() => navigator(item.route)}
                    onMouseEnter={() => setHoveredItem(item.title)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Stack direction="row" alignItems="center" sx={{ py: 1 }}>
                      <Icon
                        type={hoveredItem === item.title ? item.hoverIcon : item.icon}
                        sx={{ fontSize: '26px' }}
                      />
                      <Stack sx={{ ml: '20px', mr: 'auto' }}>
                        <Typography variant="subtitle2">{item.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.desc}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center">
                        <Typography variant="subtitle2" color="text.primary" sx={{ pr: 1 }}>
                          {item.count}
                        </Typography>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 400,
                            color: theme => alpha(theme.palette.text.primary, 0.4),
                          }}
                        >
                          {item.subfix}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Card>
                ))}
              </div>
            )}
            {/* 移除原有的创建按钮 */}
          </Card>
        </Grid>
        <Grid size={{ sm: 12, md: 6 }}>
          <Bot />
          <Card sx={{ border: '1px solid', borderColor: 'divider', mt: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle2" sx={{ mb: 0 }}>
                模型管理
              </Typography>
              <Link
                sx={{ color: 'info.main', cursor: 'pointer', fontSize: '14px' }}
                href="https://koalaqa.docs.baizhi.cloud/node/019951c1-1700-7e4e-a3a8-b6997d1e5eab"
                target="_blank"
              >
                文档
                <LaunchIcon sx={{ fontSize: 14, ml: 0.5 }} />
              </Link>
            </Stack>
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
