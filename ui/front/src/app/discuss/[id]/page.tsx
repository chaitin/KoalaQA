import { getDiscussionDiscId } from '@/api';
import { formatMeta } from '@/utils';
import { Box, Stack } from '@mui/material';
import { ResolvingMetadata } from 'next';
import Content from './ui/content';
import TitleCard from './ui/titleCard';

export async function generateMetadata(
  props: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string }>;
  },
  parent: ResolvingMetadata
) {
  const params = await props.params;
  const { id } = params;
  const data = await getDiscussionDiscId({ discId: id });
  return await formatMeta(
    {
      title: data.title,
      keywords: (data.group_ids || []).join(',') + (data.tags || []).join(','),
    },
    parent
  );
}

const Page = async (props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  const { id } = params;
  const data = await getDiscussionDiscId({ discId: id });
  data.comments?.sort((item) => {
    if (item.accepted) return -1;
    return 1;
  });
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
        <Content data={data}></Content>
      </Stack>
    </Box>
  );
};

export default Page;
