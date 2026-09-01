import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation } from "@apollo/client/index.js";
import { usePermissions, PERMISSIONS } from "../hooks/usePermissions";
import {
  Badge,
  Box,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import { MY_UNREAD_NOTIFICATION_COUNT, MY_NOTIFICATIONS } from "../gql/queries";
import {
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
} from "../gql/mutations";

const POLL_INTERVAL_MS = 30_000;

function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotificationItem {
  id: string;
  createdAt: string;
  eventType: string;
  title: string;
  message: string;
  link?: string | null;
  readAt?: string | null;
  actorDisplayName?: string | null;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canViewAllJobs = can(PERMISSIONS.JobsViewAll);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const { data: countData, refetch: refetchCount } = useQuery(
    MY_UNREAD_NOTIFICATION_COUNT,
    {
      pollInterval: POLL_INTERVAL_MS,
      fetchPolicy: "network-only",
    },
  );

  const { data: listData, refetch: refetchList } = useQuery(MY_NOTIFICATIONS, {
    variables: { limit: 20, offset: 0 },
    skip: !open,
    fetchPolicy: "network-only",
  });

  const [markRead] = useMutation(MARK_NOTIFICATION_READ);
  const [markAllRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ);

  const serverCount: number = countData?.myUnreadNotificationCount ?? 0;
  const [localCount, setLocalCount] = useState(0);

  // Sync local count when server value changes (from polling or refetch).
  useEffect(() => {
    setLocalCount(serverCount);
  }, [serverCount]);

  const unreadCount = localCount;
  const [locallyRead, setLocallyRead] = useState<Set<string>>(new Set());
  const notifications: NotificationItem[] = (
    listData?.myNotifications?.items ?? []
  ).map((n: NotificationItem) =>
    locallyRead.has(n.id) ? { ...n, readAt: n.readAt ?? "optimistic" } : n,
  );

  // Refetch list when popover opens.
  useEffect(() => {
    if (open) {
      refetchList();
    }
  }, [open, refetchList]);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleClickNotification = (n: NotificationItem) => {
    if (!n.readAt) {
      setLocalCount((c) => Math.max(0, c - 1));
      setLocallyRead((prev) => new Set(prev).add(n.id));
      markRead({ variables: { id: n.id } }).then(() => {
        refetchCount();
      });
    }
    handleClose();
    if (n.link) {
      const link =
        canViewAllJobs && n.link.startsWith("/client_view/")
          ? n.link.replace("/client_view/", "/technician_view/")
          : n.link;
      navigate(link);
    }
  };

  const handleMarkAllRead = async () => {
    setLocalCount(0);
    setLocallyRead(new Set());
    await markAllRead();
    refetchCount();
    refetchList();
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={handleOpen} sx={{ color: "white" }}>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsOutlinedIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 480 } } }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 2,
            py: 1.5,
          }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Typography
              variant="body2"
              color="primary"
              sx={{
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Typography>
          )}
        </Box>
        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ px: 2, py: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ overflow: "auto", maxHeight: 380 }}>
            {notifications.map((n) => (
              <ListItemButton
                key={n.id}
                onClick={() => handleClickNotification(n)}
                sx={{
                  bgcolor: n.readAt ? "transparent" : "action.hover",
                  alignItems: "flex-start",
                  py: 1.5,
                  px: 2,
                }}
              >
                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={n.readAt ? 400 : 600}
                        noWrap
                        sx={{ flex: 1 }}
                      >
                        {n.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1, whiteSpace: "nowrap" }}
                      >
                        {timeAgo(n.createdAt)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.25 }}
                      noWrap
                    >
                      {n.message}
                    </Typography>
                  }
                />
                {!n.readAt && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      flexShrink: 0,
                      mt: 1,
                      ml: 1,
                    }}
                  />
                )}
              </ListItemButton>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
}
