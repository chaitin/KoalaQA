import { getDiscussion } from '@/api';
import { Stack } from '@mui/material';
import { Metadata } from 'next';
import ArticleCard from './ui/article';

export const metadata: Metadata = {
  title: '技术讨论 | 长亭百川云',
};

const Page = async (props: {
  searchParams: Promise<{ search: string; sort: string }>;
}) => {
  const searchParams = await props.searchParams;
  const { search, sort } = searchParams;
  console.log(search, sort);
  const data = await getDiscussion({
    page: 1,
    size: 10,
    keyword: search,
    filter: sort as any,
  });
  return (
    <Stack gap={3} sx={{ minHeight: '100vh' }}>
      <h1 style={{ display: 'none' }}>技术评论</h1>
      <ArticleCard data={data} topics={[]} />
    </Stack>
  );
};

export default Page;
