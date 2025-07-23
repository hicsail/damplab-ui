import { useQuery } from '@apollo/client';
import { GET_ANNOUNCEMENTS } from '../gql/queries';
import { Box, Typography, Paper } from '@mui/material';

export function FormatAnnouncement({ text }: { text: string }) {
  // Split by lines
  const lines = text.split("\n");

  const formatInline = (content: string, keyPrefix: string) => {
    // Split into segments for bold and italic
    const segments = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

    return segments.map((seg, i) => {
      if (seg.startsWith("**") && seg.endsWith("**")) {
        return (
          <Typography key={`${keyPrefix}-b${i}`} component="span" fontWeight="bold">
            {seg.slice(2, -2)}
          </Typography>
        );
      }
      if (seg.startsWith("*") && seg.endsWith("*")) {
        return (
          <Typography key={`${keyPrefix}-i${i}`} component="span" fontStyle="italic">
            {seg.slice(1, -1)}
          </Typography>
        );
      }
      return seg;
    });
  };

  return (
    <>
      {lines.map((line, idx) => {
        let variant: "h4" | "h5" | "body1" = "body1";
        let content = line;

        if (line.startsWith("##")) {
          variant = "h5";
          content = line.replace(/^##\s*/, "");
        } else if (line.startsWith("#")) {
          variant = "h4";
          content = line.replace(/^#\s*/, "");
        }

        return (
          <Typography
            key={idx}
            variant={variant}
            fontWeight={variant === "h4" || variant === "h5" ? "bold" : undefined}
            color={variant === "h4" ? "primary" : variant === "h5" ? "secondary" : "text.primary"}
            sx={{ whiteSpace: "pre-line", mb: 1 }}
          >
            {formatInline(content, `line-${idx}`)}
          </Typography>
          );
      })}
    </>
  );
}

export default function AnnouncementBox() {
  const { data, loading, error } = useQuery(GET_ANNOUNCEMENTS);

  if (loading) return <p>Loading announcements...</p>;
  if (error) return <p>Error loading announcements: {error.message}</p>;

  type Announcement = {
    label: string;
    text: string;
    timestamp: string;
    is_displayed: boolean;
  };

  // Grab the first displayed announcement or null if none
  const announcement: Announcement | null = data?.announcements
    ?.filter((a: Announcement) => a.is_displayed)
    ?.[0] || null;

  if (!announcement) return <p>No announcements available.</p>;

  return (
    <Box
      sx={{
        mt: 4,
        width: '100%',
        maxWidth: 600,
        backgroundColor: '#fbfbfe',
        border: '1px solid #8fb5ba',
        borderRadius: 2,
        padding: 3,
        boxShadow: 3,
      }}
    >
      <h3 style={{ color: '#456b6e', marginBottom: '1rem' }}>📢 Announcements</h3>

      <Box sx={{ mb: 2 }}>
        <strong style={{ color: '#e04462' }}>{announcement.label}</strong>
        <p style={{ margin: '4px 0', color: '#050315' }}>{announcement.text}</p>
        <small style={{ color: '#8fb5ba' }}>
          {new Date(announcement.timestamp).toLocaleString()}
        </small>
      </Box>
    </Box>
  );
}
