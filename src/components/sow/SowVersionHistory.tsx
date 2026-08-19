import React from 'react';
import { Box, Chip, Divider, ListItemText, MenuItem, Select, Typography } from '@mui/material';
import { SowVersion, sowStatusLabel, statusColor, versionDisplayLabel } from './sowTypes';
import { formatSOWInstant } from '../../utils/sowDateUtils';

/**
 * Two pickers over the same history: which version is on screen, and which one it
 * is being compared against.
 *
 * Each row states who saved it and why, because "what changed" is usually a
 * question about a person's intent, not just about text.
 */

interface Props {
  versions: SowVersion[];
  viewing: number;
  baseline: number | null;
  onViewingChange: (versionNumber: number) => void;
  onBaselineChange: (versionNumber: number | null) => void;
  /** Customers compare against the last version they were sent; no choice offered. */
  lockBaseline?: boolean;
}

function describe(v: SowVersion): string {
  return v.note?.trim() || 'No note';
}

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : formatSOWInstant(d, 'short');
}

export default function SowVersionHistory({ versions, viewing, baseline, onViewingChange, onBaselineChange, lockBaseline }: Props): React.JSX.Element {
  const ordered = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const older = ordered.filter((v) => v.versionNumber < viewing);
  const baselineVersion = baseline != null ? versions.find((v) => v.versionNumber === baseline) : null;

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      <Select
        size="small"
        value={viewing}
        onChange={(e) => onViewingChange(Number(e.target.value))}
        sx={{ minWidth: 200 }}
        renderValue={(val) => {
          const v = versions.find((x) => x.versionNumber === Number(val));
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>Version {v ? versionDisplayLabel(v) : String(val)}</span>
              {v && <Chip size="small" label={sowStatusLabel(v.status)} color={statusColor(v.status)} />}
            </Box>
          );
        }}
      >
        {ordered.map((v) => (
          <MenuItem key={v.versionNumber} value={v.versionNumber}>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Version {versionDisplayLabel(v)}</span>
                  <Chip size="small" label={sowStatusLabel(v.status)} color={statusColor(v.status)} />
                </Box>
              }
              secondary={`${when(v.createdAt)} · ${v.createdByName} · ${describe(v)}`}
            />
          </MenuItem>
        ))}
      </Select>

      {lockBaseline ? (
        baselineVersion && (
          <Typography variant="body2" color="text.secondary">
            Changes since the version you were sent on {when(baselineVersion.sentToCustomerAt ?? baselineVersion.createdAt)}
          </Typography>
        )
      ) : (
        <>
          <Divider orientation="vertical" flexItem />
          <Typography variant="body2" color="text.secondary">
            Compare to
          </Typography>
          <Select size="small" value={baseline ?? ''} displayEmpty sx={{ minWidth: 190 }} onChange={(e) => onBaselineChange(e.target.value === '' ? null : Number(e.target.value))}>
            <MenuItem value="">
              <em>Nothing — hide changes</em>
            </MenuItem>
            {older.map((v) => (
              <MenuItem key={v.versionNumber} value={v.versionNumber}>
                {versionDisplayLabel(v)} · {sowStatusLabel(v.status).toLowerCase()} · {when(v.createdAt)}
              </MenuItem>
            ))}
          </Select>
        </>
      )}
    </Box>
  );
}
