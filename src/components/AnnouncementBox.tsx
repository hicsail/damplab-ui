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
  if (loading || error) return null; // Don't render while loading or on error

  // Grab the first announcement that is displayed
  const currentAnnouncement = data?.announcements?.[0] || null;

  if (!currentAnnouncement || !currentAnnouncement.is_displayed) return null;

  return (
    <Box
      sx={{
        ml: 4,                    // spacing between announcement and buttons
        maxWidth:  { xs: '100%', sm: 400 },          // changed to be a slimmer maximum width, og 400
        width: 'fit-content',     // adapts or shrink  to fit content 
        minWidth: 250,           
        backgroundColor: '#fbfbfe',
        border: '1px solid #8fb5ba',
        borderRadius: 2,
        padding: 3,
        boxShadow: 3,
      }}
    >
      <Typography variant="h6" fontWeight="bold" sx={{ color: "#e04462", mb: 2 }}>
        📢 Announcements:
      </Typography>
      <FormatAnnouncement text={currentAnnouncement.text} />
      <Typography variant="caption" sx={{ color: "#8fb5ba", display: "block", mt: 2 }}>
        {new Date(currentAnnouncement.timestamp).toLocaleString()}
      </Typography>
    </Box>
  );
}
