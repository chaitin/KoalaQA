import { ModelDiscussionListItem, ModelGroupItemInfo } from "@/api/types";
import { Card, MatchedString, Title } from "@/app/(banner)/s/ui/common";
import { Icon } from "@/components";
import { Avatar, Tag } from "@/components/discussion";
import { formatNumber } from "@/utils";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ChatIcon from "@mui/icons-material/ChatTwoTone";
import { Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import relativeTime from "dayjs/plugin/relativeTime";
import { useRouter } from "next/navigation";
import { CommonContext } from "@/components/commonProvider";
import { useContext, useMemo } from "react";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

const DiscussCard = ({
  data,
  keywords,
  onTopicClick,
  onTagClick,
}: {
  data: ModelDiscussionListItem;
  keywords?: string;
  onTopicClick(t: number): void;
  onTagClick(t: string): void;
}) => {
  const it = data;
  const router = useRouter();
  const { groups } = useContext(CommonContext);
  const currentGroups = useMemo(() => {
    return groups.flat.filter((item) => it.group_ids?.includes(item.id!));
  }, [groups, it.group_ids]);
  console.log(it.tags)
  return (
    <Card
      key={it.id}
      href={`/discusss/${it.id}`}
      sx={{
        boxShadow: "rgba(0, 28, 85, 0.04) 0px 4px 10px 0px",
        cursor: "auto",
        display: { xs: "none", sm: "block" },
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        gap={1}
        sx={{ mb: 2 }}
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
            href={`/discusss/${it.uuid}`}
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
              更新于 {dayjs.unix(it.updated_at!).fromNow()}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            {it.user_avatar ? (
              <img
                src={it.user_avatar}
                style={{ width: 16, height: 16, borderRadius: "50%" }}
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

      <Stack direction="row" justifyContent="space-between">
        <Stack direction="row" gap={2}>
          {currentGroups?.map((item) => {
            const label = `# ${item.name}`;
            return (
              <Tag
                sx={{ backgroundColor: "rgba(32, 108, 255, 0.1)" }}
                key={item.id}
                label={label}
                size="small"
                onClick={() => {
                  onTopicClick(item.id!);
                }}
              />
            );
          })}
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
        <Stack
          direction="row"
          justifyContent="flex-end"
          alignItems="center"
          sx={{ width: 120 }}
        >
          <Stack
            direction="row"
            gap={1}
            alignItems="center"
            justifyContent="flex-end"
            sx={{ mt: "2px", flexShrink: 0, width: 100 }}
          >
            <Stack
              direction="row"
              alignItems="center"
              gap={1}
              sx={{
                background: "rgba(32,108,255,0.1)",
                borderRadius: 0.5,
                px: 1,
                py: "1px",
                cursor: "pointer",
                "&:hover": {
                  background: "rgba(0, 0, 0, 0.12)",
                },
              }}
              onClick={() => {
                router.push(`/discusss/${it.uuid}`);
              }}
            >
              <ThumbUpAltOutlinedIcon
                sx={{
                  // color: it.is_like ? 'primary.main' : 'rgba(0,0,0,0.5)',
                  fontSize: 14,
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontSize: 14,
                  // color: it.is_like ? 'primary.main' : 'rgba(0,0,0,0.5)',
                  lineHeight: "20px",
                }}
              >
                {formatNumber(it.like || 0)}
              </Typography>
            </Stack>
            <Stack
              direction="row"
              alignItems="center"
              gap={1}
              sx={{
                background: "rgba(255,133,0,0.12)",
                borderRadius: 0.5,
                px: 1,
                py: "1px",
                cursor: "pointer",
                // '&:hover': {
                //   background: it.is_like
                //     ? 'rgba(255,133,0,0.22)'
                //     : 'rgba(0, 0, 0, 0.12)',
                // },
              }}
              onClick={() => {
                router.push(`/discusss/${it.uuid}`);
              }}
            >
              <ChatIcon
                sx={{
                  // color: it.is_like ? 'primary.main' : 'rgba(0,0,0,0.5)',
                  fontSize: 14,
                  color: "#FF8500",
                }}
              />
              <Typography
                variant="body2"
                sx={{ fontSize: 14, lineHeight: "20px", color: "#FF8500" }}
              >
                {formatNumber(it.comment || 0)}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
};

export const DiscussCardMobile = ({
  data,
  keywords,
  onTopicClick,
  onTagClick,
}: {
  data: ModelDiscussionListItem;
  keywords?: string;
  onTopicClick(t: number): void;
  onTagClick(t: string): void;
}) => {
  const it = data;
  const router = useRouter();
  const { groups } = useContext(CommonContext);
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
      onClick={() => {
        router.push(`/discusss/${it.id}`);
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
          href={`/discusss/${it.id}`}
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
            更新于 {dayjs.unix(it.updated_at!).fromNow()}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1}>
          {it.user_avatar ? (
            <img
              src={it.user_avatar}
              style={{ width: 16, height: 16, borderRadius: "50%" }}
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
        {groups.flat?.map((item) => {
          return (
            <Tag
              key={item.id}
              label={item.name}
              size="small"
              sx={{ backgroundColor: "rgba(32, 108, 255, 0.1)" }}
              onClick={() => {
                onTopicClick(item.id!);
              }}
            />
          );
        })}
        {it?.tags?.map((item) => (
          <Tag
            key={item}
            label={item}
            size="small"
            sx={{ backgroundColor: "rgba(32, 108, 255, 0.1)" }}
            onClick={() => {
              onTagClick(item);
            }}
          />
        ))}
      </Stack>
    </Card>
  );
};

export default DiscussCard;
