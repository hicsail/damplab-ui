import React, { useState } from "react";
import { useQuery } from "@apollo/client";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { JOB_ACTIVITY_TIMELINE } from "../gql/queries";
import { formatSOWInstant } from "../utils/sowDateUtils";

interface ActivityEvent {
  id: string;
  createdAt: string;
  type: string;
  message: string;
  actorDisplayName?: string | null;
  jobVersionNumber?: number | null;
  sowId?: string | null;
  sowVersionNumber?: number | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  commentId?: string | null;
  workflowNodeId?: string | null;
  serviceName?: string | null;
}

/** Map event type prefixes to a color for the timeline dot. */
function dotColor(type: string): string {
  if (type.startsWith("JOB_")) return "#6c5ce7";
  if (type.startsWith("LAB_NODE_") || type.startsWith("WORKFLOW_"))
    return "#00b894";
  if (type.startsWith("SOW_")) return "#e17055";
  if (type.startsWith("INVOICE_")) return "#fdcb6e";
  if (type.startsWith("COMMENT_")) return "#636e72";
  return "#b2bec3";
}

/** Map event type prefixes to a category label for filter chips. */
function eventCategory(type: string): string {
  if (type.startsWith("JOB_")) return "Job";
  if (type.startsWith("LAB_NODE_") || type.startsWith("WORKFLOW_"))
    return "Workflow";
  if (type.startsWith("SOW_")) return "SOW";
  if (type.startsWith("INVOICE_")) return "Invoice";
  if (type.startsWith("COMMENT_")) return "Comment";
  return "Other";
}

const CATEGORIES = [
  "All",
  "Job",
  "Workflow",
  "SOW",
  "Invoice",
  "Comment",
] as const;

/** Clickable chip that closes the drawer so the user can see the section behind it. */
function ReferenceChip({
  label,
  onClose,
}: {
  label: string;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <Chip
      label={label}
      size="small"
      variant="outlined"
      clickable
      onClick={onClose}
      sx={{
        mt: 0.5,
        mr: 0.5,
        height: 20,
        fontSize: 11,
        cursor: "pointer",
        "&:hover": { bgcolor: "action.hover", borderColor: "primary.main" },
      }}
    />
  );
}

interface Props {
  jobId: string;
  open: boolean;
  onClose: () => void;
}

export default function JobActivityTimeline({
  jobId,
  open,
  onClose,
}: Props): React.JSX.Element {
  const [filter, setFilter] = useState<string>("All");
  const { data, loading, fetchMore } = useQuery<{
    jobActivityTimeline: ActivityEvent[];
  }>(JOB_ACTIVITY_TIMELINE, {
    variables: { jobId, limit: 50 },
    skip: !open,
    fetchPolicy: "cache-and-network",
  });

  const events = data?.jobActivityTimeline ?? [];
  const filtered =
    filter === "All"
      ? events
      : events.filter((e) => eventCategory(e.type) === filter);

  const handleLoadMore = () => {
    if (!events.length) return;
    const oldest = events[events.length - 1].createdAt;
    fetchMore({ variables: { before: oldest } });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 420, maxWidth: "100vw" } }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          p: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Job History
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 0.5,
          flexWrap: "wrap",
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            size="small"
            variant={filter === cat ? "filled" : "outlined"}
            color={filter === cat ? "primary" : "default"}
            onClick={() => setFilter(cat)}
            sx={{ cursor: "pointer" }}
          />
        ))}
      </Box>

      <Box sx={{ flexGrow: 1, overflow: "auto", px: 2, py: 1.5 }}>
        {loading && !events.length ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : filtered.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", py: 6 }}
          >
            No activity events found.
          </Typography>
        ) : (
          <>
            {filtered.map((event) => (
              <Box
                key={event.id}
                sx={{
                  display: "flex",
                  gap: 1.5,
                  mb: 0,
                  position: "relative",
                  pb: 2.5,
                }}
              >
                {/* Timeline line + dot */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: 16,
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: dotColor(event.type),
                      flexShrink: 0,
                      mt: 0.5,
                    }}
                  />
                  <Box sx={{ width: 2, flexGrow: 1, bgcolor: "divider" }} />
                </Box>

                {/* Event content */}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, lineHeight: 1.4 }}
                  >
                    {event.message}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.25 }}
                  >
                    {formatSOWInstant(event.createdAt, "datetime")}
                    {event.actorDisplayName
                      ? ` \u00B7 ${event.actorDisplayName}`
                      : ""}
                  </Typography>

                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
                    {event.jobVersionNumber != null && (
                      <ReferenceChip
                        label={`Version ${event.jobVersionNumber}`}
                        onClose={onClose}
                      />
                    )}
                    {event.sowVersionNumber != null && (
                      <ReferenceChip
                        label={`SOW v${event.sowVersionNumber}`}
                        onClose={onClose}
                      />
                    )}
                    {event.invoiceNumber && (
                      <ReferenceChip
                        label={`Invoice ${event.invoiceNumber}`}
                        onClose={onClose}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            ))}

            {events.length >= 50 && (
              <Box sx={{ textAlign: "center", py: 1 }}>
                <Button
                  size="small"
                  onClick={handleLoadMore}
                  disabled={loading}
                  sx={{ textTransform: "none" }}
                >
                  {loading ? "Loading..." : "Load more"}
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Drawer>
  );
}
