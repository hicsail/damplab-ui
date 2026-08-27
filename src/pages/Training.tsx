import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router';
import { Alert, Box, Card, CardActionArea, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import { GET_GUIDES } from '../gql/queries';
import { Can } from '../components/PermissionGate';
import { PERMISSIONS } from '../hooks/usePermissions';

/**
 * The Learning Hub: guides, grouped by category.
 *
 * This page and the two it linked to were 100% hardcoded JSX with no backend
 * behind them, which is why `training:write` was granted to Administrator and read
 * by nothing. Both of those guides are now documents (see the backend's
 * `seed-guides.ts`), and this list is whatever the catalog holds.
 *
 * `training:read` is baseline, so everyone reaches it. Drafts appear only for a
 * `training:write` holder, and the server decides that — not this component.
 */
interface GuideSummary {
  id: string;
  title: string;
  slug: string;
  category?: string | null;
  isPublished?: boolean | null;
}

export default function Training() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_GUIDES, { fetchPolicy: 'cache-and-network' });
  const guides: GuideSummary[] = data?.guides ?? [];

  /** Server-ordered already (category, order, title); this only groups. */
  const byCategory = useMemo(() => {
    const groups = new Map<string, GuideSummary[]>();
    for (const guide of guides) {
      const key = guide.category?.trim() || 'General';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(guide);
    }
    return [...groups.entries()];
  }, [guides]);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <SchoolIcon color="primary" />
        <Typography variant="h4">Learning Hub</Typography>
        <Box sx={{ flex: 1 }} />
        <Can permission={PERMISSIONS.TrainingWrite}>
          <Chip label="Manage guides" color="primary" variant="outlined" onClick={() => navigate('/training/admin')} />
        </Can>
      </Stack>
      <Typography variant="body1" color="text.secondary">
        Walkthroughs for configuring DAMPLab services and designing jobs on the canvas.
      </Typography>

      {error && <Alert severity="error">Could not load the Learning Hub: {error.message}</Alert>}
      {loading && guides.length === 0 && <CircularProgress />}
      {!loading && guides.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No guides yet.
        </Typography>
      )}

      {byCategory.map(([category, items]) => (
        <Box key={category}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            {category}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            {items.map((guide) => (
              <Card key={guide.id} sx={{ height: '100%' }}>
                <CardActionArea sx={{ height: '100%' }} onClick={() => navigate(`/training/${guide.slug}`)}>
                  <CardContent sx={{ textAlign: 'left' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h6">{guide.title}</Typography>
                      {/* Only a training:write holder is sent drafts at all, so this
                          chip cannot appear for anyone else. */}
                      {guide.isPublished === false && <Chip size="small" label="Draft" />}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
