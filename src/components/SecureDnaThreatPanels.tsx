import { Box, Stack, Typography, Chip } from '@mui/material';
import { SecureDnaHazardHit, HitRegion } from '../securedna/types';

/**
 * Renders SecureDNA hazard hit details (same content as the Screener batch modal).
 */
export function SecureDnaThreatPanels({ threats }: { threats: SecureDnaHazardHit[] }) {
  if (threats.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        No threats recorded for this sequence.
      </Typography>
    );
  }
  return (
    <Stack spacing={2} sx={{ py: 1 }}>
      {threats.map((threat, threatIndex) => (
        <Box
          key={threatIndex}
          sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Chip label="THREAT" color="error" size="small" />
              <Chip
                label={String(threat.type ?? '').toUpperCase()}
                color="info"
                size="small"
                variant="outlined"
              />
              {threat.is_wild_type !== null && (
                <Chip
                  label={threat.is_wild_type ? 'Wild Type' : 'Non-Wild Type'}
                  color={threat.is_wild_type ? 'warning' : 'secondary'}
                  size="small"
                />
              )}
            </Stack>

            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                Most likely organism:
              </Typography>
              <Typography sx={{ pl: 2, wordBreak: 'break-word' }}>
                {threat.most_likely_organism?.name ?? '—'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                Hit Regions:
              </Typography>
              <Stack spacing={1} sx={{ pl: 2 }}>
                {threat.hit_regions?.map((region: HitRegion, idx: number) => (
                  <Box key={idx}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      Range: {region.seq_range_start}-{region.seq_range_end}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ wordBreak: 'break-word', fontFamily: 'monospace' }}
                    >
                      Sequence: {region.seq}
                    </Typography>
                  </Box>
                ))}
                {(!threat.hit_regions || threat.hit_regions.length === 0) && (
                  <Typography variant="body2" color="text.secondary">
                    No hit regions available
                  </Typography>
                )}
              </Stack>
            </Box>

            {threat.organisms && threat.organisms.length > 0 && (
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Related organisms:
                </Typography>
                <Stack spacing={1} sx={{ pl: 2 }}>
                  {threat.organisms.map((org, idx) => (
                    <Typography key={idx} variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {org.name}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
