import { Box, Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';
import { AUDIENCE_LABELS, AUDIENCE_OPTIONS } from '../constants/audience';

/**
 * Who a notice is addressed to.
 *
 * Any combination is allowed — "Technicians only" is a real thing the lab wants to
 * be able to say — with one rule: **at least one box**. Zero checked would be
 * "nobody", which the server rejects rather than silently treating as everyone, so
 * the Post/Save button is disabled instead of letting the request fail.
 *
 * Callers seed this with `ALL_AUDIENCES` for a new notice, so the default is
 * everyone and narrowing is a deliberate act.
 */
export default function AudiencePicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const toggle = (audience: string) => onChange(value.includes(audience) ? value.filter((a) => a !== audience) : [...value, audience]);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Audience
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Only the checked groups will see this. All four means everyone. Pick at least one.
      </Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {AUDIENCE_OPTIONS.map((audience) => (
          <FormControlLabel
            key={audience}
            control={<Checkbox size="small" checked={value.includes(audience)} onChange={() => toggle(audience)} />}
            label={AUDIENCE_LABELS[audience]}
          />
        ))}
      </Stack>
      {value.length === 0 && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
          Pick at least one audience. An announcement addressed to nobody is not saved.
        </Typography>
      )}
    </Box>
  );
}
