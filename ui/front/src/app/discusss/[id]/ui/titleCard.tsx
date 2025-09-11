"use client";
import { deleteDiscussionDiscId } from "@/api/Discussion";
import { ModelDiscussionDetail, ModelUserRole } from "@/api/types";
import { Card, Icon, MarkDown } from "@/components";
import { AuthContext } from "@/components/authProvider";
import { ReleaseModal, Tag } from "@/components/discussion";
import Modal from "@/components/modal";
import { BBS_TAG_COLOR_ICON } from "@/constant/discussion";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { IconButton, Menu, MenuItem, Stack, Typography } from "@mui/material";
import { useBoolean } from "ahooks";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import relativeTime from "dayjs/plugin/relativeTime";
import { useRouter } from "next/navigation";
import { useContext, useRef } from "react";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

const TitleCard = ({ data }: { data: ModelDiscussionDetail }) => {
  const [menuVisible, { setFalse: menuClose, setTrue: menuOpen }] =
    useBoolean(false);
  const { user } = useContext(AuthContext);
  const [releaseVisible, { setFalse: releaseClose, setTrue: releaseOpen }] =
    useBoolean(false);
  const router = useRouter();
  const anchorElRef = useRef(null);
  const handleDelete = () => {
    menuClose();
    Modal.confirm({
      title: "确定删除话题吗？",
      okButtonProps: { color: "error" },
      onOk: async () => {
        await deleteDiscussionDiscId({ discId: data.id + "" }).then(() => {
          router.push("/");
        });
      },
    });
  };
  console.log(data);
  return (
    <Card
      sx={{
        boxShadow: "rgba(0, 28, 85, 0.04) 0px 4px 10px 0px",
        cursor: "auto",
      }}
    >
      <ReleaseModal
        status="edit"
        open={releaseVisible}
        data={data}
        onClose={releaseClose}
        selectedTags={[]}
        onOk={() => {
          releaseClose();
          router.refresh();
        }}
      />
      <Menu
        id="basic-menu"
        anchorEl={anchorElRef.current}
        open={menuVisible}
        onClose={menuClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        <MenuItem
          onClick={() => {
            releaseOpen();
            menuClose();
          }}
        >
          编辑话题
        </MenuItem>
        <MenuItem onClick={handleDelete}>删除话题</MenuItem>
      </Menu>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        gap={2}
        sx={{ mb: { xs: "12px", sm: 0 }, width: "100%" }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          gap={2}
          sx={{ width: { xs: "100%", sm: "calc(100% - 80px)" } }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: 20,
              display: { xs: "-webkit-box", sm: "block" },
              WebkitLineClamp: { sm: 1, xs: 2 },
              WebkitBoxOrient: "vertical",
              textOverflow: { sm: "ellipsis" },
              whiteSpace: { sm: "nowrap", xs: "normal" },
              overflow: "hidden",
              fontWeight: 600,
              maxWidth: { xs: "100%", sm: "calc(100% - 90px)" },
            }}
          >
            {data.title}
          </Typography>
        </Stack>
        {(data.user_id === user.uid ||
          [
            ModelUserRole.UserRoleAdmin,
            ModelUserRole.UserRoleOperator,
          ].includes(user.role || ModelUserRole.UserRoleUnknown)) && (
          <IconButton
            size="small"
            ref={anchorElRef}
            onClick={menuOpen}
            sx={{ display: { xs: "none", sm: "flex" } }}
          >
            <MoreVertIcon />
          </IconButton>
        )}
      </Stack>
      <Typography
        sx={{
          display: { sm: "none", xs: "block" },
          fontSize: 12,
          color: "rgba(0,0,0,0.5)",
        }}
      >
        发布于 {dayjs.unix(data.created_at!).fromNow()}
      </Typography>
      <Stack
        direction="row"
        alignItems="flex-end"
        gap={2}
        justifyContent="space-between"
        sx={{ mt: { xs: "12px", sm: 3 }, mb: 3 }}
      >
        <Stack direction="row" flexWrap="wrap" gap="8px 16px">
          {data.groups?.map((item) => {
            const label = `# ${item.name}`;
            return (
              <Tag
                key={item.id}
                label={label}
                sx={{ backgroundColor: "rgba(32, 108, 255, 0.1)" }}
                size="small"
                onClick={() => {
                  window.open(`/discussion?topic=${item.id}`, "_blank");
                }}
              />
            );
          })}
          {data.tags?.map((item: string) => {
            const label = (
              <Stack
                direction="row"
                alignItems="center"
                sx={{ lineHeight: 1 }}
                gap={0.5}
              >
                {item}
              </Stack>
            );
            return (
              <Tag
                key={item}
                label={label}
                size="small"
                sx={{
                  // backgroundColor: current?.backgroundColor,
                  "&:hover": {
                    // backgroundColor: current?.color,
                  },
                }}
                onClick={() => {
                  window.open(`/discussion?tag=${item}`, "_blank");
                }}
              />
            );
          })}
        </Stack>
        <Stack
          direction="row"
          justifyContent="flex-end"
          alignItems="center"
          gap={1}
          sx={{ width: 120, display: { xs: "none", sm: "flex" } }}
        >
          <Typography
            variant="body2"
            sx={{ fontSize: 12, color: "rgba(0,0,0,0.5)" }}
          >
            发布于 {dayjs.unix(data.created_at!).fromNow()}
          </Typography>
        </Stack>
      </Stack>
      <MarkDown content={data.content} />
    </Card>
  );
};

export default TitleCard;
