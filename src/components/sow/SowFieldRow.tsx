import React, { useCallback, useState } from 'react';
import { Alert, Box, Checkbox, Chip, Collapse, FormControlLabel, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SowFieldSourceControls from './SowFieldSourceControls';
import SowDiffText from './SowDiffText';
import type { FieldDiff } from '../../utils/sowDiff';
import { SowField, SowVersionInputs, isCustomField } from './sowTypes';

/**
 * One section of the SOW.
 *
 * Rows are collapsed by default: a staff member scanning an eighteen-section
 * contract needs the shape of the document first, and the controls only for the
 * section they are actually changing.
 *
 * Three states are worth seeing without expanding, so each gets a marker rather
 * than a colour alone: edited by hand, hidden from the customer, and generated
 * from billing data (which cannot be typed over).
 */

interface Props {
  field: SowField;
  inputs: SowVersionInputs;
  staff: Array<{ id: string; displayName: string }>;
  readOnly?: boolean;
  expanded: boolean;
  /** Keyed by field key so the parent can pass one stable function for every row. */
  onToggleExpand: (key: string) => void;
  onChangeField: (key: string, patch: Partial<SowField>) => void;
  onChangeInputs: (patch: Partial<SowVersionInputs>) => void;
  onRenameCustom?: (key: string, label: string) => void;
  /** How this section differs from the version being compared against, if any. */
  diff?: FieldDiff;
  /** feeSchedule only: local service costs no longer match the job's live figures. */
  stale?: boolean;
  onRecalculate?: () => void;
  liveCustomerCategory?: string | null;
}

const DIFF_CHIP: Record<string, string> = {
  changed: 'Changed',
  added: 'New section',
  removed: 'Removed',
  shown: 'Now shown',
  hidden: 'Now hidden'
};

function firstLine(text: string): string {
  const line = (text || '').split('\n').find((l) => l.trim() !== '') ?? '';
  return line.replace(/^-\s*/, '');
}

function SowFieldRow({ field, inputs, staff, readOnly, expanded, onToggleExpand, onChangeField, onChangeInputs, onRenameCustom, diff, stale, onRecalculate, liveCustomerCategory }: Props): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const key = field.key;

  // Wraps the parent's stable, key-taking callback so the rest of this
  // component can call it the same way it always did.
  const changeField = useCallback((patch: Partial<SowField>) => onChangeField(key, patch), [onChangeField, key]);
  const toggleExpand = useCallback(() => onToggleExpand(key), [onToggleExpand, key]);

  const canEditText = field.allowsTextOverride && !readOnly;
  // Mirrors the modal's Send-button gate exactly, so this chip is never wrong
  // about whether Send is actually blocked on this section — it just says so
  // right where staff are already looking, rather than relying on the
  // isEnabled auto-recovery (see runPreview) to have already caught up.
  const needsAttention = !field.allowsEmpty && (!field.isEnabled || !field.value?.trim());
  const hasSourceControls = ['sowTitle', 'engagementResources', 'periodOfPerformance', 'scopeOfWork', 'deliverables', 'feeSchedule'].includes(field.key);
  const preview = firstLine(field.value);
  const diffKind = diff && diff.kind !== 'unchanged' ? diff.kind : null;
  // A section that moved since the comparison version outranks an override as the
  // thing worth noticing, so it claims the left rule.
  const ruleColor = diffKind ? 'info.main' : field.isOverridden ? 'warning.main' : 'transparent';

  return (
    <Box
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        // A left rule marks a hand-edited section, so overrides are visible while scanning.
        borderLeft: '3px solid',
        borderLeftColor: ruleColor,
        // A hidden section is dimmed to read as "not part of the document" —
        // except when it's also blocking Send, where staying dim would bury
        // the one thing that needs attention.
        opacity: field.isEnabled || needsAttention ? 1 : 0.55,
        bgcolor: expanded ? 'action.hover' : 'transparent'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, pl: 1, pr: 1.5 }}>
        <IconButton size="small" onClick={toggleExpand} aria-label={expanded ? `Collapse ${field.label}` : `Expand ${field.label}`} aria-expanded={expanded}>
          {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>

        <Box sx={{ flex: 1, minWidth: 0 }} onClick={toggleExpand} role="button" tabIndex={-1}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }} data-verbatim-text>
              {field.label}
            </Typography>
            {needsAttention && <Chip size="small" label="Required" color="error" />}
            {stale && <Chip size="small" label="Stale" color="warning" />}
            {diffKind && <Chip size="small" label={DIFF_CHIP[diffKind]} color="info" variant="outlined" />}
            {field.isOverridden && <Chip size="small" label="Edited" color="warning" variant="outlined" />}
            {!field.isEnabled && <Chip size="small" label="Hidden from customer" variant="outlined" />}
            {field.requiresInitials && <Chip size="small" label="Requires initials" color="secondary" variant="outlined" />}
          </Box>
          {!expanded && (
            <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.25 }} data-verbatim-text>
              {preview || <em>Empty</em>}
            </Typography>
          )}
        </Box>

        {canEditText && (
          <Tooltip title={editing ? 'Done editing' : 'Edit this text'}>
            <span>
              <IconButton
                size="small"
                color={editing ? 'primary' : 'default'}
                aria-label={`Edit ${field.label}`}
                onClick={() => {
                  if (!expanded) toggleExpand();
                  setEditing((v) => !v);
                }}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {!field.allowsTextOverride && (
          <Tooltip title="Generated from the service costs and adjustments below. Invoices bill from these figures, so this section has no free-text edit — change the figures instead.">
            <span>
              <IconButton size="small" disabled aria-label={`${field.label} cannot be edited as text`}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {onRecalculate && (
          <Tooltip title="Pull the job's current service costs and pricing category back in — any adjustments you've added stay as they are.">
            <span>
              <IconButton
                size="small"
                color={stale ? 'warning' : 'default'}
                disabled={readOnly}
                aria-label={`Recalculate ${field.label} from the job's current figures`}
                onClick={onRecalculate}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {canEditText && field.isOverridden && (
          <Tooltip title="Revert to the generated text">
            <span>
              <IconButton
                size="small"
                aria-label={`Revert ${field.label} to calculated value`}
                onClick={() => {
                  changeField({ isOverridden: false, value: field.calculatedValue ?? '' });
                  setEditing(false);
                }}
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}

        <Tooltip title={field.isEnabled ? 'Shown to the customer' : 'Hidden from the customer'}>
          <Checkbox size="small" checked={field.isEnabled} disabled={readOnly} inputProps={{ 'aria-label': `Show ${field.label} to the customer` }} onChange={(e) => changeField({ isEnabled: e.target.checked })} />
        </Tooltip>
      </Box>

      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ px: 6, pb: 2 }}>
          {isCustomField(field.key) && (
            <TextField size="small" label="Section heading" sx={{ mb: 2, width: 320 }} value={field.label} disabled={readOnly} onChange={(e) => onRenameCustom?.(key, e.target.value)} />
          )}

          {hasSourceControls && (
            <Box sx={{ mb: 2 }}>
              {field.key === 'feeSchedule' && stale && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  The pricing category or service costs no longer match the job. Refresh the Fee Schedule to update this snapshot — it will not change on its own.
                </Alert>
              )}
              <SowFieldSourceControls
                fieldKey={field.key}
                inputs={inputs}
                staff={staff}
                disabled={readOnly}
                onChange={onChangeInputs}
                liveCustomerCategory={liveCustomerCategory}
              />
            </Box>
          )}

          <FormControlLabel
            sx={{ mb: 1, display: 'flex' }}
            control={
              <Checkbox
                size="small"
                checked={field.requiresInitials}
                disabled={readOnly}
                onChange={(e) => changeField({ requiresInitials: e.target.checked })}
              />
            }
            label={<Typography variant="body2">Ask the customer to initial this section when signing</Typography>}
          />

          {!editing && diff?.kind === 'changed' && diff.parts ? (
            <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
              <SowDiffText parts={diff.parts} />
            </Box>
          ) : editing && canEditText ? (
            <TextField
              multiline
              fullWidth
              minRows={4}
              value={field.value}
              autoFocus
              helperText="Plain text. A line beginning with “- ” becomes a bullet."
              onChange={(e) => changeField({ value: e.target.value, isOverridden: e.target.value !== (field.calculatedValue ?? '') })}
            />
          ) : (
            <Box
              data-verbatim-text
              sx={{
                whiteSpace: 'pre-wrap',
                fontSize: 14,
                lineHeight: 1.6,
                color: field.value ? 'text.primary' : 'text.disabled',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5
              }}
            >
              {field.value || 'This section is empty.'}
            </Box>
          )}

          {field.isOverridden && field.calculatedValue != null && !editing && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Edited by hand. The generated version is available through the revert button.
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

// The parent re-renders on every keystroke in unrelated controls (the change
// note, another row's text). With stable callbacks passed down (see
// SowEditorModal's toggleExpand/patchField), the props below are unchanged in
// those cases, so memoizing here skips re-rendering rows nothing happened to.
export default React.memo(SowFieldRow);
