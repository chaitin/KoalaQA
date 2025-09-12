"use client";
import { AuthContext } from "@/components/authProvider";
import { Stack, Typography, Box, Divider, Tooltip, Badge } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { Avatar } from "@/components/discussion";
import React, { useContext, useEffect, useState, useRef } from "react";
import ProfilePanel from "./profilePanel";
import { useRouter } from "next/navigation";

type MsgNotifyType = number;

type MessageNotifyInfo = {
  discuss_id: number;
  discuss_title: string;
  type: MsgNotifyType;
  from_id: number;
  from_name: string;
  from_bot: boolean;
  to_id: number;
  to_name: string;
  to_bot: boolean;
};
export interface LoggedInProps {
  user: any | null;
  verified: boolean;
}

const LoggedInView: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState<MessageNotifyInfo[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  // 保存 ws 实例的 ref
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = new URL("/api/user/notify", window.location.href);
    url.protocol = wsProtocol;
    const wsUrlBase = url.toString();
    const wsUrl = token ? `${wsUrlBase}` : wsUrlBase;
    const ws = new WebSocket(wsUrl);
    // 保存 ws 实例
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 1: // 未读数量
          setUnreadCount(message.data as number);
          break;
        case 3: // 消息内容
          const newNotification = message.data as MessageNotifyInfo;
          setNotifications((prev) => [newNotification, ...prev]);
          break;
      }
    };

    // 连接建立后请求未读消息数
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 1 }));
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  const handleNotificationClick = (notification: MessageNotifyInfo) => {
    // 使用已存在的 ws 连接
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const id = (notification as any).id ?? notification.discuss_id;
      wsRef.current.send(JSON.stringify({ type: 2, id }));

      // 更新UI
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.filter(
          (n) =>
            ((n as any).id ?? n.discuss_id) !==
            ((notification as any).id ?? notification.discuss_id)
        )
      );
      // router.push(`/discusss/${notification.discuss_id}`);
    }
  };

  return (
    <>
      <Tooltip
        placement="bottom-end"
        slotProps={{
          tooltip: {
            sx: {
              backgroundColor: "#fff",
              boxShadow: "0px 20px 40px 0px rgba(0,28,85,0.06)",
              minWidth: "300px",
              padding: "20px",
              borderRadius: "8px",
            },
          },
          popper: {
            sx: {
              paddingRight: "24px",
              margin: "0px -24px 0px 0px !important",
            },
          },
        }}
        title={<ProfilePanel />}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* 头像：浅蓝色渐变背景，悬停有阴影 */}
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(180deg, #F5FAFF 0%, #EDF6FF 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background .18s, box-shadow .18s, transform .08s",
              "&:hover": {
                background: "#E6F3FF",
                boxShadow: "0 6px 12px rgba(11,92,255,0.12)",
                transform: "translateY(-1px)",
              },
            }}
          >
            <Avatar size={36} src={user?.avatar} />
          </Box>
        </Box>
      </Tooltip>
      <Tooltip
        placement="bottom-end"
        slotProps={{
          tooltip: {
            sx: {
              backgroundColor: "#fff",
              boxShadow: "0px 20px 40px 0px rgba(0,28,85,0.06)",
              minWidth: "300px",
              padding: "20px",
              borderRadius: "8px",
              color: "primary.main",
            },
          },
          popper: {
            sx: {
              paddingRight: "24px",
              margin: "0px -24px 0px 0px !important",
            },
          },
        }}
        open
        title={
          <Stack spacing={2} sx={{ maxHeight: 400, overflowY: "auto" }}>
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              通知消息 ({unreadCount})
            </Typography>
            <Divider />
            {notifications.length === 0 ? (
              <Box sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
                暂无通知
              </Box>
            ) : (
              notifications.map((notification, index) => (
                <Stack
                  key={index}
                  sx={{
                    py: 1,
                    px: 2,
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                    borderRadius: 1,
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {notification.from_bot ? "系统" : notification.from_name}{" "}
                    在帖子 《{notification.discuss_title}》中{" "}
                    {notification.type === 1 ? "回复了你" : "提到了你"}
                  </Typography>
                </Stack>
              ))
            )}
          </Stack>
        }
      >
        <Badge
          badgeContent={unreadCount}
          overlap="circular"
          sx={{
            "& .MuiBadge-badge": {
              backgroundColor: "#FF3B30",
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(11,92,255,0.12)",
              transform: "translate(10%, -20%)",
            },
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#F4F8FF",
              transition: "background .18s, transform .08s",
              cursor: "pointer",
              "&:hover": {
                backgroundColor: "#E6F0FF",
                transform: "translateY(-1px)",
              },
              "&:active": { transform: "translateY(0)" },
            }}
          >
            <NotificationsIcon sx={{ color: "#0B5FFF" }} />
          </Box>
        </Badge>
      </Tooltip>
    </>
  );
};

export default LoggedInView;
