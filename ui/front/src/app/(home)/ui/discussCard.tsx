import { ModelDiscussionListItem } from "@/api/types";
import { Card, MatchedString, Title } from "@/app/(banner)/s/ui/common";
import { MarkDown } from "@/components";
import { CommonContext } from "@/components/commonProvider";
import { Avatar, Tag } from "@/components/discussion";
import { Box, Chip, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import relativeTime from "dayjs/plugin/relativeTime";
import Image from "next/image";
import { useContext, useMemo } from "react";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

const DiscussCard = ({
  data,
  keywords,
  onTopicClick,
}: {
  data: ModelDiscussionListItem;
  keywords?: string;
  onTopicClick(t: number): void;
}) => {
  const it = data;
  const { groups } = useContext(CommonContext);

  // 根据group_ids获取分组名称
  const groupNames = useMemo(() => {
    if (!it.group_ids || !groups.flat.length) return [];

    return it.group_ids
      .map((groupId) => {
        const group = groups.flat.find((g) => g.id === groupId);
        return group?.name;
      })
      .filter(Boolean) as string[];
  }, [it.group_ids, groups.flat]);

  return (
    <Card
      key={it.id}
      sx={{
        boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
        cursor: 'auto',
        display: { xs: 'none', sm: 'block' },
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        gap={1}
        sx={{ mb: 1 }}
      >
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          sx={{
            width: "calc(100% - 248px)",
            "&:hover": {
              ".title": {
                color: "primary.main",
              },
            },
          }}
        >
          <Title
            className="title text-ellipsis"
            href={`/discuss/${it.uuid}`}
            target="_blank"
          >
            <MatchedString
              keywords={keywords}
              str={it.title || ""}
            ></MatchedString>
          </Title>
        </Stack>
        <Stack
          direction="row"
          justifyContent={"flex-end"}
          alignItems="center"
          gap={2}
          sx={{ color: "#666", width: 240, flexShrink: 0 }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography
              variant="body2"
              sx={{ fontSize: 12, lineHeight: 1, color: "rgba(0,0,0,0.5)" }}
            >
              <time dateTime={dayjs.unix(it.updated_at!).format()} title={dayjs.unix(it.updated_at!).format('YYYY-MM-DD HH:mm:ss')}>
                更新于 {dayjs.unix(it.updated_at!).fromNow()}
              </time>
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            {it.user_avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.user_avatar}
                width={16}
                height={16}
                style={{ borderRadius: "50%" }}
                alt="头像"
              />
            ) : (
              <Avatar size={16} />
            )}

            <Typography
              variant="body2"
              className="text-ellipsis"
              sx={{
                maxWidth: 90,
                fontSize: 12,
                mt: "1px",
                color: "rgba(0,0,0,0.5)",
                "&:hover": {
                  cursor: "pointer",
                  color: "primary.main",
                },
              }}
            >
              {it.user_name}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
      <Box
        sx={{ fontSize: 12, lineHeight: 1, mb: 1, color: "rgba(0,0,0,0.5)" }}
      >
        <MarkDown
          content={it.content}
          truncateLength={100} // 设置截断长度为100个字符，根据需要调整
        />
      </Box>

      <Stack direction="row" justifyContent="space-between">
        <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
          {/* 分组标签 */}
          {groupNames.map((groupName) => (
            <Chip
              key={groupName}
              label={groupName}
              size="small"
              sx={{
                backgroundColor: "rgba(76, 175, 80, 0.1)",
                color: "#4CAF50",
                fontSize: "12px",
                height: "24px",
                "& .MuiChip-label": {
                  px: 1,
                },
              }}
            />
          ))}

          {/* 标签 */}
          {it?.tags?.map((item) => (
            <Tag
              key={item}
              label={item}
              size="small"
              sx={{ backgroundColor: "rgba(32, 108, 255, 0.1)" }}
            // onClick={() => {
            //   onTagClick(item);
            // }}
            />
          ))}
        </Stack>
      </Stack>
    </Card>
  );
};

export const DiscussCardMobile = ({
  data,
  keywords,
}: {
  data: ModelDiscussionListItem;
  keywords?: string;
}) => {
  const it = data;
  const { groups } = useContext(CommonContext);

  // 根据group_ids获取分组名称
  const groupNames = useMemo(() => {
    if (!it.group_ids || !groups.flat.length) return [];

    return it.group_ids
      .map((groupId) => {
        const group = groups.flat.find((g) => g.id === groupId);
        return group?.name;
      })
      .filter(Boolean) as string[];
  }, [it.group_ids, groups.flat]);
  return (
    <Card
      key={it.id}
      sx={{
        p: "20px",
        display: { xs: "flex", sm: "none" },
        flexDirection: "column",
        gap: 1.5,
        boxShadow: "rgba(0, 28, 85, 0.04) 0px 4px 10px 0px",
        cursor: "auto",
        width: "100%",
      }}
    >
      <Stack
        direction={"column"}
        alignItems="flex-start"
        gap={1}
        sx={{
          width: "100%",
        }}
      >
        <Title
          className="title multiline-ellipsis"
          href={`/discuss/${it.uuid}`}
          target="_blank"
          sx={{ width: "100%", whiteSpace: "wrap" }}
        >
          <MatchedString
            keywords={keywords}
            str={it.title || ""}
          ></MatchedString>
        </Title>

        {/* {data.status === DomainDiscussionStatus.DiscussionStatusClose && (
          <Tag label='讨论已关闭' />
        )} */}
      </Stack>
      <Stack
        direction="row"
        alignItems="center"
        gap={3}
        sx={{ color: "#666", width: 300, flexShrink: 0 }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography
            variant="body2"
            sx={{ fontSize: 12, lineHeight: 1, color: "rgba(0,0,0,0.5)" }}
          >
            <time dateTime={dayjs.unix(it.updated_at!).format()} title={dayjs.unix(it.updated_at!).format('YYYY-MM-DD HH:mm:ss')}>
              更新于 {dayjs.unix(it.updated_at!).fromNow()}
            </time>
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1}>
          {it.user_avatar ? (
            <Image
              src={it.user_avatar}
              width={16}
              height={16}
              style={{ borderRadius: "50%" }}
              alt="头像"
            />
          ) : (
            <Avatar size={16} />
          )}

          <Typography
            className="text-ellipsis"
            sx={{
              mt: "2px",
              fontSize: 12,
              color: "rgba(0,0,0,0.5)",
              "&:hover": {
                cursor: "pointer",
                color: "primary.main",
              },
            }}
          >
            {it.user_name}
          </Typography>
        </Stack>
      </Stack>
      <Stack direction="row" gap="8px 12px" flexWrap="wrap">
        {/* 分组标签 */}
        {groupNames.map((groupName) => (
          <Chip
            key={groupName}
            label={groupName}
            size="small"
            sx={{
              backgroundColor: "rgba(76, 175, 80, 0.1)",
              color: "#4CAF50",
              fontSize: "12px",
              height: "24px",
              "& .MuiChip-label": {
                px: 1,
              },
            }}
          />
        ))}

        {/* 标签 */}
        {it?.tags?.map((item) => (
          <Tag
            key={item}
            label={item}
            size="small"
            sx={{ backgroundColor: "rgba(32, 108, 255, 0.1)" }}
          />
        ))}
      </Stack>
    </Card>
  );
};

export default DiscussCard;
