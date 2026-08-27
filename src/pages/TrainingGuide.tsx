import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router';
import { Alert, Box, Button, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { GET_GUIDE_BY_SLUG } from '../gql/queries';
import Markdown from '../components/ReactMarkdown';

/**
 * One Learning Hub guide, rendered from markdown.
 *
 * Uses the same `Markdown` component the announcements do — deliberately not a
 * second renderer, so a guide and an announcement format identically and there is
 * one place to fix a rendering bug.
 *
 * Images in a guide are external URLs. There is no upload path, which means a
 * moved or access-restricted source will break the image; the editor says so.
 */
export default function TrainingGuide() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_GUIDE_BY_SLUG, { variables: { slug }, fetchPolicy: 'cache-and-network' });
  const guide = data?.guideBySlug;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/training')} sx={{ mb: 2 }}>
        Back to Learning Hub
      </Button>

      {error && <Alert severity="error">Could not load this guide: {error.message}</Alert>}
      {loading && !guide && <CircularProgress />}
      {!loading && !guide && <Alert severity="info">That guide does not exist, or has not been published yet.</Alert>}

      {guide && (
        <>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
            <Typography variant="h4">{guide.title}</Typography>
            {guide.category && <Chip size="small" variant="outlined" label={guide.category} />}
            {guide.isPublished === false && <Chip size="small" label="Draft" />}
          </Stack>
          {guide.updatedAt && (
            <Typography variant="caption" color="text.secondary">
              Last updated {new Date(guide.updatedAt).toLocaleDateString()}
              {guide.updatedBy ? ` by ${guide.updatedBy}` : ''}
            </Typography>
          )}
          <Divider sx={{ my: 2 }} />
          <Markdown>{guide.body ?? ''}</Markdown>
        </>
      )}
    </Box>
  );
}
