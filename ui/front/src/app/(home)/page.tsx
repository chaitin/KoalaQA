import { getDiscussion, getGroup } from "@/api";
import GroupsInitializer from "@/components/groupsInitializer";
import { ApiParamsBuilder, batchApiCalls } from "@/lib/api-helpers";
import { Stack } from "@mui/material";
import { Metadata } from "next";
import { Suspense } from "react";
import ArticleCard from "./ui/article";

export const metadata: Metadata = {
  title: "技术讨论 | Koala QA",
  description: "浏览和参与技术讨论，分享知识和经验",
};

// 数据获取函数 - 使用新的工具
async function fetchDiscussions(searchParams: { 
  search?: string; 
  sort?: string; 
  tps?: string;
  page?: string;
  type?: string;
}) {
  const { search, sort, tps, page = "1", type } = searchParams;
  const topics = tps ? tps.split(",").map(Number) : [];

  // 使用 ApiParamsBuilder 构建参数
  const params = new ApiParamsBuilder()
    .add("page", page)
    .add("size", "10")
    .add("filter", sort)
    .add("keyword", search)
    .add("type", type || "qa")
    .build();
  
  // 添加多个 group_ids
  if (topics.length) {
    topics.forEach(id => params.append('group_ids', String(id)));
  }

  // httpClient 现在内置了缓存和重试，直接调用即可
  try {
    return await getDiscussion(params);
  } catch (error) {
    console.error("Failed to fetch discussions:", error);
    return { items: [], total: 0 };
  }
}

async function fetchGroups() {
  // httpClient 现在内置了缓存和重试，直接调用即可
  try {
    return await getGroup();
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return { items: [] };
  }
}

const Page = async (props: {
  searchParams: Promise<{ search?: string; sort?: string; tps?: string; page?: string; type?: string }>;
}) => {
  const searchParams = await props.searchParams;
  const { tps, type } = searchParams;
  
  // 将 url 中的 tps 参数（逗号分隔的字符串）转换为数字数组
  const topics = tps ? tps.split(",").map(Number) : [];

  // 使用批量 API 调用工具
  const results = await batchApiCalls({
    discussions: () => fetchDiscussions(searchParams),
    groups: () => fetchGroups()
  });

  const data = results.discussions || { items: [], total: 0 };
  const groupsData = results.groups || { items: [] };

  return (
    <GroupsInitializer groupsData={groupsData}>
      <Stack gap={3} sx={{ minHeight: "100vh" }}>
        <h1 style={{ display: "none" }}>问答</h1>
        <Suspense fallback={<div>加载中...</div>}>
          <ArticleCard data={data} topics={topics} groups={groupsData} type={type} />
        </Suspense>
      </Stack>
    </GroupsInitializer>
  );
};

export default Page;
