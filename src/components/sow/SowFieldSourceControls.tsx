import React from 'react';
import { Box, Button, IconButton, MenuItem, Select, TextField, Typography, InputAdornment, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { SowVersionInputs, SowVersionAdjustment, formatCurrency, formatMultiplier, customerCategoryLabel, serviceLineCost, serviceMultiplier, serviceUnitCost } from './sowTypes';

/**
 * The structured inputs behind each generated section, rendered inside the
 * section they produce. Putting the Project Manager dropdown in the Engagement
 * Resources row — rather than in a separate panel — keeps each control next to
 * the sentence it writes.
 */

interface StaffOption {
  id: string;
  displayName: string;
}

interface Props {
  fieldKey: string;
  inputs: SowVersionInputs;
  staff: StaffOption[];
  disabled?: boolean;
  onChange: (patch: Partial<SowVersionInputs>) => void;
  /** feeSchedule only: the job's current pricing category (read-only context). */
  liveCustomerCategory?: string | null;
}

const labelSx = { display: 'block', mb: 0.5, color: 'text.secondary', fontWeight: 500 } as const;

/** Inline add/remove list. Kept local rather than reusing DeliverablesEditor, which opens its own dialog. */
function StringListEditor({ items, onChange, disabled, addLabel }: { items: string[]; onChange: (next: string[]) => void; disabled?: boolean; addLabel: string }): React.JSX.Element {
  return (
    <Box>
      {items.map((item, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
          <TextField
            size="small"
            fullWidth
            multiline
            value={item}
            disabled={disabled}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <IconButton size="small" aria-label={`Remove item ${i + 1}`} disabled={disabled} onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon />} disabled={disabled} onClick={() => onChange([...items, ''])}>
        {addLabel}
      </Button>
    </Box>
  );
}

export default function SowFieldSourceControls({ fieldKey, inputs, staff, disabled, onChange, liveCustomerCategory }: Props): React.JSX.Element | null {
  switch (fieldKey) {
    case 'sowTitle':
      return (
        <Box>
          <Typography variant="caption" sx={labelSx}>
            Document title
          </Typography>
          <TextField size="small" fullWidth value={inputs.sowTitle ?? ''} disabled={disabled} placeholder="Agreement to Perform Research Services" onChange={(e) => onChange({ sowTitle: e.target.value })} />
        </Box>
      );

    case 'engagementResources':
      return (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: 220, flex: 1 }}>
            <Typography variant="caption" sx={labelSx}>
              Project manager
            </Typography>
            <Select size="small" fullWidth displayEmpty value={inputs.projectManager ?? ''} disabled={disabled} onChange={(e) => onChange({ projectManager: String(e.target.value) })}>
              <MenuItem value="">
                <em>Not assigned</em>
              </MenuItem>
              {staff.map((s) => (
                <MenuItem key={s.id} value={s.displayName}>
                  {s.displayName}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Box sx={{ minWidth: 220, flex: 1 }}>
            <Typography variant="caption" sx={labelSx}>
              Project lead
            </Typography>
            <Select size="small" fullWidth displayEmpty value={inputs.projectLead ?? ''} disabled={disabled} onChange={(e) => onChange({ projectLead: String(e.target.value) })}>
              <MenuItem value="">
                <em>Not assigned</em>
              </MenuItem>
              {staff.map((s) => (
                <MenuItem key={s.id} value={s.displayName}>
                  {s.displayName}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Box>
      );

    case 'periodOfPerformance':
      return (
        <Box>
          <Typography variant="caption" sx={labelSx}>
            Periods — add more than one for work that pauses and resumes. Past dates are allowed.
          </Typography>
          {(inputs.periods ?? []).map((p, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
              <DatePicker
                label="Start"
                value={p.startDate ? new Date(p.startDate) : null}
                disabled={disabled}
                slotProps={{ textField: { size: 'small', sx: { width: 170 } } }}
                onChange={(d) => {
                  if (!d || Number.isNaN(d.getTime())) return;
                  const next = [...inputs.periods];
                  next[i] = { ...p, startDate: new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString() };
                  onChange({ periods: next });
                }}
              />
              <TextField
                label="Duration"
                size="small"
                type="number"
                sx={{ width: 130 }}
                disabled={disabled}
                value={p.durationDays}
                InputProps={{ endAdornment: <InputAdornment position="end">days</InputAdornment> }}
                onChange={(e) => {
                  const next = [...inputs.periods];
                  next[i] = { ...p, durationDays: Math.max(0, Number(e.target.value) || 0) };
                  onChange({ periods: next });
                }}
              />
              <TextField
                label="Label"
                size="small"
                sx={{ width: 180 }}
                disabled={disabled}
                placeholder={`Period ${i + 1}`}
                value={p.label ?? ''}
                onChange={(e) => {
                  const next = [...inputs.periods];
                  next[i] = { ...p, label: e.target.value };
                  onChange({ periods: next });
                }}
              />
              <IconButton size="small" aria-label={`Remove period ${i + 1}`} disabled={disabled} onClick={() => onChange({ periods: inputs.periods.filter((_, idx) => idx !== i) })}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button
            size="small"
            startIcon={<AddIcon />}
            disabled={disabled}
            onClick={() => onChange({ periods: [...(inputs.periods ?? []), { startDate: new Date().toISOString(), durationDays: 14, label: '' }] })}
          >
            Add period
          </Button>
        </Box>
      );

    case 'scopeOfWork':
      return (
        <Box>
          <Typography variant="caption" sx={labelSx}>
            Scope items
          </Typography>
          <StringListEditor items={inputs.scopeOfWork ?? []} disabled={disabled} addLabel="Add scope item" onChange={(scopeOfWork) => onChange({ scopeOfWork })} />
        </Box>
      );

    case 'deliverables':
      return (
        <Box>
          <Typography variant="caption" sx={labelSx}>
            Deliverables
          </Typography>
          <StringListEditor items={inputs.deliverables ?? []} disabled={disabled} addLabel="Add deliverable" onChange={(deliverables) => onChange({ deliverables })} />
        </Box>
      );

    case 'feeSchedule':
      return (
        <Box>
          <Typography variant="caption" sx={labelSx}>
            Pricing category — set on the job screen; this Fee Schedule is a snapshot until you refresh it.
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Documented: {customerCategoryLabel(inputs.customerCategory)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Job: {customerCategoryLabel(liveCustomerCategory)}
          </Typography>

          <Typography variant="caption" sx={labelSx}>
            Service costs — these are what invoices bill from, so this section has no free-text edit.
          </Typography>
          {(inputs.services ?? []).map((s, i) => {
            const multiplier = serviceMultiplier(s);
            const unitCost = serviceUnitCost(s);
            return (
              <Box key={s.serviceId || i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap title={s.name}>
                  {s.name}
                </Typography>
                {/* The box holds the base price, so the multiplier and the total
                    it produces have to be on screen beside it — otherwise staff
                    can no longer see what the line actually bills. */}
                <TextField
                  size="small"
                  type="number"
                  label="Base price"
                  sx={{ width: 150 }}
                  disabled={disabled}
                  value={unitCost}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  onChange={(e) => {
                    const nextUnit = Math.max(0, Number(e.target.value) || 0);
                    const next = [...inputs.services];
                    next[i] = { ...s, unitCost: nextUnit, multiplier, cost: serviceLineCost(nextUnit, multiplier) };
                    onChange({ services: next });
                  }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', minWidth: 120, textAlign: 'right' }}>
                  {multiplier === 1 ? formatCurrency(s.cost) : `× ${formatMultiplier(multiplier)} = ${formatCurrency(s.cost)}`}
                </Typography>
              </Box>
            );
          })}

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="caption" sx={labelSx}>
            Adjustments
          </Typography>
          {(inputs.adjustments ?? []).map((a, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
              <Select
                size="small"
                sx={{ width: 160 }}
                value={a.type}
                disabled={disabled}
                onChange={(e) => {
                  const next = [...inputs.adjustments];
                  next[i] = { ...a, type: e.target.value as SowVersionAdjustment['type'] };
                  onChange({ adjustments: next });
                }}
              >
                <MenuItem value="ADDITIONAL_COST">Additional cost</MenuItem>
                <MenuItem value="DISCOUNT">Discount</MenuItem>
              </Select>
              <TextField
                size="small"
                sx={{ flex: 1, minWidth: 160 }}
                label="Description"
                disabled={disabled}
                value={a.description}
                onChange={(e) => {
                  const next = [...inputs.adjustments];
                  next[i] = { ...a, description: e.target.value };
                  onChange({ adjustments: next });
                }}
              />
              <TextField
                size="small"
                sx={{ width: 130 }}
                label="Amount"
                type="number"
                disabled={disabled}
                value={a.amount}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                onChange={(e) => {
                  const next = [...inputs.adjustments];
                  next[i] = { ...a, amount: Math.max(0, Number(e.target.value) || 0) };
                  onChange({ adjustments: next });
                }}
              />
              <TextField
                size="small"
                sx={{ width: 160 }}
                label="Reason"
                disabled={disabled}
                value={a.reason ?? ''}
                onChange={(e) => {
                  const next = [...inputs.adjustments];
                  next[i] = { ...a, reason: e.target.value };
                  onChange({ adjustments: next });
                }}
              />
              <IconButton size="small" aria-label={`Remove adjustment ${i + 1}`} disabled={disabled} onClick={() => onChange({ adjustments: inputs.adjustments.filter((_, idx) => idx !== i) })}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
            <Button
              size="small"
              startIcon={<AddIcon />}
              disabled={disabled}
              onClick={() => onChange({ adjustments: [...(inputs.adjustments ?? []), { type: 'ADDITIONAL_COST', description: '', amount: 0 }] })}
            >
              Add adjustment
            </Button>
            <Typography variant="body2" color="text.secondary">
              Total {formatCurrency(inputs.totalCost ?? 0)}
            </Typography>
          </Box>
        </Box>
      );

    default:
      return null;
  }
}
