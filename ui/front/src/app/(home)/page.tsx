import { getDiscussion } from "@/api";
import { Stack } from "@mui/material";
import { Metadata } from "next";
import ArticleCard from "./ui/article";

export const metadata: Metadata = {
  title: "技术讨论 | Koala QA",
};

const Page = async (props: {
  searchParams: Promise<{ search: string; sort: string; tps?: string }>;
}) => {
  const searchParams = await props.searchParams;
  const { search, sort, tps } = searchParams;

  // 将 url 中的 tps 参数（逗号分隔的字符串）转换为数字数组
  const topics = tps ? tps.split(",").map(Number) : [];

  const data = await getDiscussion({
    page: 1,
    size: 10,
    keyword: search,
    filter: sort as any,
    group_ids: topics, // 如果 API 支持，可以添加分组过滤
  });

  return (
    <Stack gap={3} sx={{ minHeight: "100vh" }}>
      <h1 style={{ display: "none" }}>问答</h1>
      <ArticleCard data={data} topics={topics} />
    </Stack>
  );
};

export default Page;
