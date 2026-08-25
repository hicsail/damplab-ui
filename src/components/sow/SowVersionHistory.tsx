import React from 'react';
import { Box, Button, Chip, Divider, ListItemText, MenuItem, Select, Tooltip, Typography } from '@mui/material';
import { SowVersion, sowStatusLabel, statusColor, versionDisplayLabel } from './sowTypes';
import { formatSOWInstant } from '../../utils/sowDateUtils';
import { compareToVersions, revertIsEnabled, SowViewing, UNSAVED_VIEW } from './sowEditorView';

/**
 * Two pickers over the same history: which version is on screen, and which one it
 * is being compared against.
 *
 * Each row states who saved it and why, because "what changed" is usually a
 * question about a person's intent, not just about text.
 */

interface Props {
  versions: SowVersion[];
  viewing: SowViewing;
  baseline: number | null;
  onViewingChange: (viewing: SowViewing) => void;
  onBaselineChange: (versionNumber: number | null) => void;
  /** Customers compare against the last version they were sent; no choice offered. */
  lockBaseline?: boolean;
  /** Staff working copy — listed in Version when there are unsaved edits. */
  unsaved?: boolean;
  unsavedBasedOn?: string;
  onRevert?: () => void;
  /** Overrides the default Revert tooltip when the action is a restore, not a local copy. */
  revertTooltip?: string;
  onReset?: () => void;
  resetDisabled?: boolean;
  busy?: boolean;
}

function describe(v: SowVersion): string {
  return v.note?.trim() || 'No note';
}

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : formatSOWInstant(d, 'datetime');
}

export default function SowVersionHistory({
  versions,
  viewing,
  baseline,
  onViewingChange,
  onBaselineChange,
  lockBaseline,
  unsaved,
  unsavedBasedOn,
  onRevert,
  revertTooltip,
  onReset,
  resetDisabled,
  busy
}: Props): React.JSX.Element {
  const ordered = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const baselineVersion = baseline != null ? versions.find((v) => v.versionNumber === baseline) : null;
  const compareOptions = compareToVersions(versions, viewing);
  const revertDisabled = busy || !revertIsEnabled(viewing);

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      <Select
        size="small"
        value={viewing === UNSAVED_VIEW ? UNSAVED_VIEW : String(viewing)}
        onChange={(e) => {
          const val = e.target.value;
          onViewingChange(val === UNSAVED_VIEW ? UNSAVED_VIEW : Number(val));
        }}
        sx={{ minWidth: 200 }}
        renderValue={(val) => {
          if (val === UNSAVED_VIEW) {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Unsaved</span>
                <Chip size="small" label="Unsaved" color="warning" />
              </Box>
            );
          }
          const v = versions.find((x) => x.versionNumber === Number(val));
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>Version {v ? versionDisplayLabel(v) : String(val)}</span>
              {v && <Chip size="small" label={sowStatusLabel(v.status)} color={statusColor(v.status)} />}
            </Box>
          );
        }}
      >
        {unsaved && (
          <MenuItem value={UNSAVED_VIEW}>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Unsaved</span>
                  <Chip size="small" label="Unsaved" color="warning" />
                </Box>
              }
              secondary={unsavedBasedOn ? `Based on version ${unsavedBasedOn} · not saved yet` : 'Not saved yet'}
            />
          </MenuItem>
        )}
        {ordered.map((v) => (
          <MenuItem key={v.versionNumber} value={String(v.versionNumber)}>
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

      {onRevert && (
        <Tooltip title={revertDisabled ? 'Select a saved version to revert to.' : revertTooltip ?? 'Replace Unsaved with this version.'}>
          <span>
            <Button size="small" variant="outlined" disabled={revertDisabled} onClick={onRevert}>
              Revert
            </Button>
          </span>
        </Tooltip>
      )}

      {onReset && (
        <Tooltip title={resetDisabled ? 'No unsaved edits to discard.' : 'Discard unsaved edits and restore the last saved version.'}>
          <span>
            <Button size="small" color="inherit" disabled={resetDisabled} onClick={onReset}>
              Reset
            </Button>
          </span>
        </Tooltip>
      )}

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
          <Select
            size="small"
            value={baseline == null ? '' : String(baseline)}
            displayEmpty
            sx={{ minWidth: 200 }}
            onChange={(e) => onBaselineChange(e.target.value === '' ? null : Number(e.target.value))}
            renderValue={(val) => {
              if (val === '' || val == null) return <em>Nothing</em>;
              const v = versions.find((x) => x.versionNumber === Number(val));
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{v ? versionDisplayLabel(v) : String(val)}</span>
                  {v && <Chip size="small" label={sowStatusLabel(v.status)} color={statusColor(v.status)} />}
                </Box>
              );
            }}
          >
            <MenuItem value="">
              <em>Nothing</em>
            </MenuItem>
            {compareOptions.map((v) => (
              <MenuItem key={v.versionNumber} value={String(v.versionNumber)}>
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
        </>
      )}
    </Box>
  );
}
