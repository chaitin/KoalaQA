import { CusTabs } from '@c-x/ui';

import Card from '@/components/card';
import { useAppDispatch } from '@/store';
import { setPageName } from '@/store/slices/breadcrumb';
import { Box, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Doc from './doc';
import Qa from './qa';

const AdminDocument = () => {
  const dispatch = useAppDispatch();
  const location = useLocation(); // 获取 location 对象
  const queryString = location.search; // 获取查询字符串
  const urlParams = new URLSearchParams(queryString);
  const navigator = useNavigate();
  const encodedName = urlParams.get('name');
  const { tab, id } = useParams();
  const tabs = [
    { label: '问答对', value: 'qa' },
    { label: '文档', value: 'doc' },
  ];
  useEffect(() => {
    dispatch(setPageName(encodedName));

    return () => {
      dispatch(setPageName(''));
    };
  }, []);
  return (
    <Stack
      component={Card}
      sx={{
        height: '100%',
        position: 'relative',
      }}
    >
      <Stack
        spacing={2}
        direction='row'
        alignItems='center'
        sx={{ mb: 2, flexShrink: 0 }}
      >
        <CusTabs
          list={tabs}
          defatValue={tab}
          onChange={(str) =>
            navigator(`/admin/ai/${id}/${str}?name=${encodedName}`)
          }
        />
        <Typography variant='caption'>
          {tab === 'qa'
            ? '用于配置可直接命中的标准答案，解决常见高频问题'
            : '用于沉淀同步文档资料，供检索引用以提供完整、上下文相关的回答'}
        </Typography>
      </Stack>
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {tab === 'doc' ? <Doc /> : <Qa />}
      </Box>
    </Stack>
  );
};

export default AdminDocument;
