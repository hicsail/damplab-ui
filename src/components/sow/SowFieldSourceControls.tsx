import React from 'react';
import { Box, Button, IconButton, MenuItem, Select, TextField, Typography, InputAdornment, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  SowVersionInputs,
  SowVersionAdjustment,
  SowAdjustmentCategory,
  SOW_ADJUSTMENT_CATEGORIES,
  SowPeriod,
  formatCurrency,
  formatMultiplier,
  customerCategoryLabel,
  serviceLineCost,
  serviceMultiplier,
  serviceUnitCost,
  adjustmentDescriptionText,
  adjustmentLineAmount,
  adjustmentMultiplier,
  adjustmentUnitAmount,
  newPeriodDragKey,
  sowTotals
} from './sowTypes';
import { sowDateToPickerValue, pickerValueToSowDate, todaySowDate, periodOfPerformanceDays } from '../../utils/sowDateUtils';

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
const rawTextNoteSx = { display: 'block', mt: 1, color: 'text.secondary', fontStyle: 'italic' } as const;


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

/** Identity for the reorder list, falling back to the index for a draft written
 *  before periods carried drag keys. */
function periodDragId(p: SowPeriod, i: number): string {
  return p._dragKey ?? `period-index-${i}`;
}

function SortablePeriodRow({
  id,
  period,
  index,
  disabled,
  onPatch,
  onRemove
}: {
  id: string;
  period: SowPeriod;
  index: number;
  disabled?: boolean;
  onPatch: (patch: Partial<SowPeriod>) => void;
  onRemove: () => void;
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'center',
        mb: 1,
        flexWrap: 'wrap',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        bgcolor: isDragging ? 'action.hover' : undefined,
        borderRadius: 1
      }}
    >
      {/* The handle is the only listener surface, so the inputs beside it keep
          their own pointer behaviour (text selection, the picker popup). */}
      <Box
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder period ${index + 1}`}
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: disabled ? 'text.disabled' : 'text.secondary',
          cursor: disabled ? 'default' : 'grab',
          touchAction: 'none',
          '&:active': { cursor: disabled ? 'default' : 'grabbing' }
        }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>
      <DatePicker
        label="Start"
        value={sowDateToPickerValue(period.startDate)}
        disabled={disabled}
        slotProps={{ textField: { size: 'small', sx: { width: 170 } } }}
        onChange={(d) => {
          if (!d || Number.isNaN(d.getTime())) return;
          onPatch({ startDate: pickerValueToSowDate(d) });
        }}
      />
      <TextField
        label="Duration"
        size="small"
        type="number"
        sx={{ width: 130 }}
        disabled={disabled}
        value={period.durationDays}
        InputProps={{ endAdornment: <InputAdornment position="end">days</InputAdornment> }}
        onChange={(e) => onPatch({ durationDays: Math.max(0, Number(e.target.value) || 0) })}
      />
      <TextField
        label="Label"
        size="small"
        sx={{ width: 180 }}
        disabled={disabled}
        placeholder={`Period ${index + 1}`}
        value={period.label ?? ''}
        onChange={(e) => onPatch({ label: e.target.value })}
      />
      <IconButton size="small" aria-label={`Remove period ${index + 1}`} disabled={disabled} onClick={onRemove}>
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

/**
 * The period rows, reorderable by handle. Order is not cosmetic: an unlabelled
 * period is printed as "Period <n>" by its index in the generated prose.
 *
 * Its own component because useSensors is a hook and the parent is a switch.
 */
function PeriodListEditor({ periods, disabled, onChange }: { periods: SowPeriod[]; disabled?: boolean; onChange: (next: SowPeriod[]) => void }): React.JSX.Element {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = periods.map(periodDragId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onChange(arrayMove(periods, from, to));
  };

  return (
    <Box>
      <Typography variant="caption" sx={labelSx}>
        Periods — add more than one for work that pauses and resumes. Past dates are allowed. Drag a row by its handle to reorder.
      </Typography>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {periods.map((p, i) => (
            <SortablePeriodRow
              key={ids[i]}
              id={ids[i]}
              period={p}
              index={i}
              disabled={disabled}
              onPatch={(patch) => onChange(periods.map((entry, idx) => (idx === i ? { ...entry, ...patch } : entry)))}
              onRemove={() => onChange(periods.filter((_, idx) => idx !== i))}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button
        size="small"
        startIcon={<AddIcon />}
        disabled={disabled}
        onClick={() => onChange([...periods, { startDate: todaySowDate(), durationDays: 14, label: '', _dragKey: newPeriodDragKey() }])}
      >
        Add period
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
            <Select size="small" fullWidth displayEmpty value={inputs.projectManager ?? ''} disabled={disabled} onChange={(e) => {
              const name = String(e.target.value);
              const match = staff.find((s) => s.displayName === name);
              onChange({ projectManager: name, projectManagerId: match?.id ?? undefined });
            }}>
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
            <Select size="small" fullWidth displayEmpty value={inputs.projectLead ?? ''} disabled={disabled} onChange={(e) => {
              const name = String(e.target.value);
              const match = staff.find((s) => s.displayName === name);
              onChange({ projectLead: name, projectLeadId: match?.id ?? undefined });
            }}>
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
          <Typography variant="caption" sx={rawTextNoteSx}>
            Editing this section’s raw text changes only what the document says — it does not reassign anyone. Use these dropdowns to set the assignees.
          </Typography>
        </Box>
      );

    case 'periodOfPerformance':
      return <PeriodListEditor periods={inputs.periods ?? []} disabled={disabled} onChange={(periods) => onChange({ periods })} />;

    case 'scopeOfWork':
      return (
        <Box>
          <Typography variant="caption" sx={labelSx}>
            Scope items
          </Typography>
          <StringListEditor items={inputs.scopeOfWork ?? []} disabled={disabled} addLabel="Add scope item" onChange={(scopeOfWork) => onChange({ scopeOfWork })} />
          <Typography variant="caption" sx={rawTextNoteSx}>
            Editing this section’s raw text changes only what the document says — it does not add or remove operations from the workflow.
          </Typography>
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
                    onChange({ services: next, ...sowTotals(next, inputs.adjustments) });
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
          {(inputs.adjustments ?? []).map((a, i) => {
            const adjMultiplier = adjustmentMultiplier(a);
            const adjUnit = adjustmentUnitAmount(a);
            const signedAmount = a.type === 'DISCOUNT' ? -Math.abs(a.amount) : Math.abs(a.amount);
            /** Every edit rewrites the whole line: `amount` is what invoices bill from, so it can never lag the boxes that produce it. */
            const patchLine = (patch: Partial<SowVersionAdjustment>, unit = adjUnit, multiplier = adjMultiplier): void => {
              const next = [...inputs.adjustments];
              next[i] = { ...a, ...patch, unitAmount: unit, multiplier, amount: adjustmentLineAmount(unit, multiplier) };
              onChange({ adjustments: next, ...sowTotals(inputs.services, next) });
            };
            return (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  sx={{ flex: 1, minWidth: 140 }}
                  label="Description/Reason"
                  disabled={disabled}
                  value={adjustmentDescriptionText(a)}
                  // Typing folds a legacy reason into the description. The document
                  // joins the two with the same dash, so its wording is unchanged —
                  // it just becomes one editable string instead of two boxes.
                  onChange={(e) => patchLine({ description: e.target.value, reason: null })}
                />
                {/* Collapsed to its sign so it reads as part of the amount beside
                    it; the menu still spells both options out. */}
                <Select
                  size="small"
                  sx={{ width: 72 }}
                  value={a.type}
                  disabled={disabled}
                  inputProps={{ 'aria-label': `Adjustment ${i + 1}: additional cost or discount` }}
                  renderValue={(v) => (v === 'DISCOUNT' ? '−' : '+')}
                  onChange={(e) => patchLine({ type: e.target.value as SowVersionAdjustment['type'] })}
                >
                  <MenuItem value="ADDITIONAL_COST">Additional cost</MenuItem>
                  <MenuItem value="DISCOUNT">Discount</MenuItem>
                </Select>
                <TextField
                  size="small"
                  sx={{ width: 104 }}
                  label="Amount"
                  type="number"
                  disabled={disabled}
                  value={adjUnit}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  onChange={(e) => patchLine({}, Math.max(0, Number(e.target.value) || 0))}
                />
                <TextField
                  size="small"
                  sx={{ width: 92 }}
                  label="Multiplier"
                  type="number"
                  disabled={disabled}
                  value={adjMultiplier}
                  inputProps={{ min: 0, step: 'any' }}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    patchLine({}, adjUnit, Number.isFinite(raw) && raw > 0 ? raw : 1);
                  }}
                />
                <Select
                  size="small"
                  sx={{ width: 176 }}
                  displayEmpty
                  value={a.category ?? ''}
                  disabled={disabled}
                  renderValue={(v) => SOW_ADJUSTMENT_CATEGORIES.find((c) => c.value === v)?.label ?? 'Category'}
                  onChange={(e) => {
                    const category = (e.target.value || null) as SowAdjustmentCategory | null;
                    // Days seeds the multiplier from the period of performance, the
                    // same figure that section quotes. It is only a starting point —
                    // staff can type over it, and later period edits leave it alone.
                    const seeded = category === 'DAYS' ? Math.max(1, periodOfPerformanceDays(inputs.periods)) : adjMultiplier;
                    patchLine({ category }, adjUnit, seeded);
                  }}
                >
                  {SOW_ADJUSTMENT_CATEGORIES.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
                {/* Signed, like the figure this line puts in the document. The
                    boxes to the left are the working, so only the result is
                    restated here — unlike a service line, whose multiplier comes
                    from the workflow and appears nowhere else on the row. */}
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', minWidth: 96, textAlign: 'right' }}>
                  {formatCurrency(signedAmount)}
                </Typography>
                <IconButton
                  size="small"
                  aria-label={`Remove adjustment ${i + 1}`}
                  disabled={disabled}
                  onClick={() => {
                    const next = inputs.adjustments.filter((_, idx) => idx !== i);
                    onChange({ adjustments: next, ...sowTotals(inputs.services, next) });
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            );
          })}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
            <Button
              size="small"
              startIcon={<AddIcon />}
              disabled={disabled}
              onClick={() => {
                const next: SowVersionAdjustment[] = [
                  ...(inputs.adjustments ?? []),
                  { type: 'ADDITIONAL_COST', description: '', amount: 0, unitAmount: 0, multiplier: 1, category: 'SERVICE' }
                ];
                onChange({ adjustments: next, ...sowTotals(inputs.services, next) });
              }}
            >
              Add adjustment
            </Button>
            <Typography variant="body2" color="text.secondary">
              Total {formatCurrency(sowTotals(inputs.services, inputs.adjustments).totalCost)}
            </Typography>
          </Box>
        </Box>
      );

    default:
      return null;
  }
}
