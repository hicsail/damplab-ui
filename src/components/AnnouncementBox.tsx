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
            sx={{ whiteSpace: "pre-line", mb: 1 }}
            fontWeight={variant === "h4" || variant === "h5" ? "bold" : undefined}
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
  const currentAnnouncement = data?.announcements?.[0] || null;

  if (!currentAnnouncement) return <p>No announcements available.</p>;

  return (
    <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
        {loading ? (
            <Typography>Loading...</Typography>
        ) : currentAnnouncement && currentAnnouncement.is_displayed ? (
            <>
            <FormatAnnouncement text={currentAnnouncement.text} />
            </>
        ) : (
            <Typography>No announcement displayed.</Typography>
        )}
      </Paper>
  );
}
