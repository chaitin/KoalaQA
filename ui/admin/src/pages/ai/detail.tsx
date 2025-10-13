import Card from '@/components/card';
import { useAppDispatch } from '@/store';
import { setPageName } from '@/store/slices/breadcrumb';
import { Box, Stack } from '@mui/material';
import { useEffect } from 'react';
import Doc from './doc';
import Qa from './qa';
import Web from './web';
import Kb from './kb';

const AdminDocument = ({ tab }: { tab: 'qa' | 'doc' | 'web' | 'kb' }) => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const pageName =
      tab === 'qa' ? '问答对' : tab === 'doc' ? '通用文档' : tab === 'web' ? '在线网页' : '知识库';
    dispatch(setPageName(pageName));
    return () => {
      dispatch(setPageName(''));
    };
  }, [tab]);
  return (
    <Stack
      component={tab !== 'kb' ? Card : Box}
      sx={{
        height: '100%',
        position: 'relative',
      }}
    >
      {tab === 'qa' ? <Qa /> : tab === 'doc' ? <Doc /> : tab === 'web' ? <Web /> : <Kb />}
    </Stack>
  );
};

export default AdminDocument;
