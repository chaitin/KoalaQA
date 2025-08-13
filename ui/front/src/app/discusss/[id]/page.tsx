import React from 'react';
import { ResolvingMetadata } from 'next';
import { Box, Stack } from '@mui/material';
import TitleCard from './ui/titleCard';
import Content from './ui/content';
import InfoRelevance from './ui/infoRelevance';
import {
  getDiscussionDiscId,
} from '@/api';
import { formatMeta } from '@/utils';

export async function generateMetadata(
  props: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string }>;
  },
  parent: ResolvingMetadata
) {
  const params = await props.params;
  const { id } = params;
  const data = await getDiscussionDiscId({discId: id});
  return await formatMeta(
    {
      title: data.title,
      // description: data.c,
      keywords: (data.group_ids || []).join(',') + (data.tags || []).join(','),
    },
    parent
  );
}

const Page = async (props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  const { id } = params;
  const data =await getDiscussionDiscId({discId: id});

  return (
    <Box
      sx={{
        zIndex: 1,
        width: { xs: '100%', sm: 1200 },
        mx: 'auto',
        pt: 11,
        pb: '100px',
        px: { xs: 2, sm: 0 },
        minHeight: '100vh',
      }}
    >
      <TitleCard data={data}></TitleCard>
      <Box
        sx={{
          my: '20px',
          display: { xs: 'block', sm: 'none' },
        }}
      />
      <Stack
        direction='row'
        alignItems='flex-start'
        sx={{ mt: { xs: 0, sm: 3 } }}
        gap={3}
      >
        <Content data={data} ></Content>
        <InfoRelevance data={data} />
      </Stack>
    </Box>
  );
};

export default Page;
