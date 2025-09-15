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

  const params = new URLSearchParams();
    params.set("page", "1");
    params.set("size", "10");
    if (sort) params.set("filter", sort)
    if (search) params.set("keyword", search);
    if(topics.length) topics.forEach(id => params.append('group_ids', id+''));
    getDiscussion(params);
  const data = await getDiscussion(params);
  return (
    <Stack gap={3} sx={{ minHeight: "100vh" }}>
      <h1 style={{ display: "none" }}>问答</h1>
      <ArticleCard data={data} topics={topics} />
    </Stack>
  );
};

export default Page;
