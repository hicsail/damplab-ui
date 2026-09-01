import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/index.js";
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import { MY_NOTIFICATION_PREFERENCES } from "../gql/queries";
import { UPDATE_NOTIFICATION_PREFERENCES } from "../gql/mutations";
import { NOTIFICATION_EVENT_TYPES } from "../constants/notificationEventTypes";

export default function NotificationPreferences() {
  const { data, loading, error } = useQuery(MY_NOTIFICATION_PREFERENCES, {
    fetchPolicy: "cache-and-network",
  });
  const [updatePrefs] = useMutation(UPDATE_NOTIFICATION_PREFERENCES);

  const [emailDisabled, setEmailDisabled] = useState<string[]>([]);
  const [inAppDisabled, setInAppDisabled] = useState<string[]>([]);
  const [snack, setSnack] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (data?.myNotificationPreferences) {
      setEmailDisabled(
        data.myNotificationPreferences.emailDisabledEventTypes ?? [],
      );
      setInAppDisabled(
        data.myNotificationPreferences.inAppDisabledEventTypes ?? [],
      );
    }
  }, [data]);

  const handleToggle = async (
    channel: "email" | "inApp",
    eventType: string,
    currentlyEnabled: boolean,
  ) => {
    const prev = {
      emailDisabled: [...emailDisabled],
      inAppDisabled: [...inAppDisabled],
    };

    let nextEmail = emailDisabled;
    let nextInApp = inAppDisabled;

    if (channel === "email") {
      nextEmail = currentlyEnabled
        ? [...emailDisabled, eventType]
        : emailDisabled.filter((e) => e !== eventType);
      setEmailDisabled(nextEmail);
    } else {
      nextInApp = currentlyEnabled
        ? [...inAppDisabled, eventType]
        : inAppDisabled.filter((e) => e !== eventType);
      setInAppDisabled(nextInApp);
    }

    try {
      await updatePrefs({
        variables: {
          input: {
            emailDisabledEventTypes: nextEmail,
            inAppDisabledEventTypes: nextInApp,
          },
        },
      });
      setSnack({ message: "Preferences saved", severity: "success" });
    } catch {
      setEmailDisabled(prev.emailDisabled);
      setInAppDisabled(prev.inAppDisabled);
      setSnack({ message: "Failed to save preferences", severity: "error" });
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <NotificationsOutlinedIcon color="primary" />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Notification Preferences
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose which notifications you receive via in-app alerts and email.
          </Typography>
        </Box>
      </Stack>

      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        All notifications are enabled by default. Toggle off any you don't want
        to receive.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Could not load preferences.
        </Alert>
      )}

      {loading && !data ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Event</TableCell>
                <TableCell align="center">In-App</TableCell>
                <TableCell align="center">Email</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {NOTIFICATION_EVENT_TYPES.map((evt) => {
                const inAppEnabled = !inAppDisabled.includes(evt.eventType);
                const emailEnabled = !emailDisabled.includes(evt.eventType);

                return (
                  <TableRow key={evt.eventType} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {evt.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {evt.description}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={inAppEnabled}
                        onChange={() =>
                          handleToggle("inApp", evt.eventType, inAppEnabled)
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {evt.supportsEmail ? (
                        <Switch
                          checked={emailEnabled}
                          onChange={() =>
                            handleToggle("email", evt.eventType, emailEnabled)
                          }
                          size="small"
                        />
                      ) : (
                        <Tooltip title="Email not available for this event">
                          <span>
                            <Switch checked={false} disabled size="small" />
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        message={snack?.message}
      />
    </Box>
  );
}
