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
            {data?.items?.map(item => (
              <Card
                key={item.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#F8F9FA',
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography
                    variant="subtitle2"
                    sx={{ cursor: 'pointer', flexGrow: 1 }}
                    onClick={() => toDetail(item)}
                  >
                    {item.name}
                  </Typography>
                  <IconButton
                    id="basic-button"
                    aria-controls={open ? 'basic-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    onClick={clickOption}
                  >
                    <MoreHorizIcon />
                  </IconButton>
                  <Menu
                    id="basic-menu"
                    anchorEl={anchorEl}
                    open={open}
                    onClose={closeOption}
                    slotProps={{
                      list: {
                        'aria-labelledby': 'basic-button',
                      },
                    }}
                  >
                    {/* <MenuItem
                      onClick={event => {
                        event.stopPropagation();
                        deleteKb(item);
                      }}
                    >
                      删除
                    </MenuItem> */}
                    <MenuItem
                      onClick={e => {
                        e.stopPropagation();
                        handleEdit(item);
                      }}
                    >
                      编辑
                    </MenuItem>
                  </Menu>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ width: '70%', flexGrow: 0 }}
                >
                  <Stack
                    direction="row"
                    justifyContent="center"
                    alignItems="center"
                    sx={{ flex: 1 }}
                    spacing={1}
                  >
                    <Typography variant="body2">问答对</Typography>
                    <Button
                      variant="text"
                      onClick={() => navigator(`/admin/ai/${item.id}/qa?name=${item.name}`)}
                    >
                      {item.qa_count}
                    </Button>
                  </Stack>
                  <Divider orientation="vertical" sx={{ height: '34px' }} />
                  <Stack
                    direction="row"
                    justifyContent="center"
                    alignItems="center"
                    sx={{ flex: 1 }}
                    spacing={1}
                  >
                    <Typography variant="body2">知识库</Typography>
                    <Button
                      variant="text"
                      onClick={() => navigator(`/admin/ai/${item.id}/doc?name=${item.name}`)}
                    >
                      {item.doc_count}
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            ))}
            {/* <Button
              sx={{ mt: 2 }}
              size='small'
              startIcon={
                <Icon type='icon-add' sx={{ fontSize: '12px !important' }} />
              }
              onClick={creatRepo}
            >
              添加一个知识库
            </Button> */}
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
