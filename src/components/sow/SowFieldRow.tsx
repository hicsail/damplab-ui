import React, { useState } from 'react';
import { Box, Checkbox, Chip, Collapse, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
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
  onToggleExpand: () => void;
  onChangeField: (patch: Partial<SowField>) => void;
  onChangeInputs: (patch: Partial<SowVersionInputs>) => void;
  onRenameCustom?: (label: string) => void;
  /** How this section differs from the version being compared against, if any. */
  diff?: FieldDiff;
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

export default function SowFieldRow({ field, inputs, staff, readOnly, expanded, onToggleExpand, onChangeField, onChangeInputs, onRenameCustom, diff }: Props): React.JSX.Element {
  const [editing, setEditing] = useState(false);

  const canEditText = field.allowsTextOverride && !readOnly;
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
        opacity: field.isEnabled ? 1 : 0.55,
        bgcolor: expanded ? 'action.hover' : 'transparent'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, pl: 1, pr: 1.5 }}>
        <IconButton size="small" onClick={onToggleExpand} aria-label={expanded ? `Collapse ${field.label}` : `Expand ${field.label}`} aria-expanded={expanded}>
          {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>

        <Box sx={{ flex: 1, minWidth: 0 }} onClick={onToggleExpand} role="button" tabIndex={-1}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }} data-verbatim-text>
              {field.label}
            </Typography>
            {diffKind && <Chip size="small" label={DIFF_CHIP[diffKind]} color="info" variant="outlined" />}
            {field.isOverridden && <Chip size="small" label="Edited" color="warning" variant="outlined" />}
            {!field.isEnabled && <Chip size="small" label="Hidden from customer" variant="outlined" />}
            {!field.allowsTextOverride && (
              <Tooltip title="Generated from the service costs and adjustments below. Invoices bill from these figures, so the text cannot be typed over.">
                <LockOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
              </Tooltip>
            )}
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
                  if (!expanded) onToggleExpand();
                  setEditing((v) => !v);
                }}
              >
                <EditOutlinedIcon fontSize="small" />
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
                  onChangeField({ isOverridden: false, value: field.calculatedValue ?? '' });
                  setEditing(false);
                }}
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}

        <Tooltip title={field.isEnabled ? 'Shown to the customer' : 'Hidden from the customer'}>
          <Checkbox size="small" checked={field.isEnabled} disabled={readOnly} inputProps={{ 'aria-label': `Show ${field.label} to the customer` }} onChange={(e) => onChangeField({ isEnabled: e.target.checked })} />
        </Tooltip>
      </Box>

      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ px: 6, pb: 2 }}>
          {isCustomField(field.key) && (
            <TextField size="small" label="Section heading" sx={{ mb: 2, width: 320 }} value={field.label} disabled={readOnly} onChange={(e) => onRenameCustom?.(e.target.value)} />
          )}

          {hasSourceControls && (
            <Box sx={{ mb: 2 }}>
              <SowFieldSourceControls fieldKey={field.key} inputs={inputs} staff={staff} disabled={readOnly} onChange={onChangeInputs} />
            </Box>
          )}

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
              onChange={(e) => onChangeField({ value: e.target.value, isOverridden: e.target.value !== (field.calculatedValue ?? '') })}
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
