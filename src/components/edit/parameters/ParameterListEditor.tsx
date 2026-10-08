import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { idFromName } from '../../../utils/idFromName';
import SampleSheetTemplateField, { SampleSheetTemplateOwner } from '../SampleSheetTemplateField';
import { createDragKey, EditableParameter } from './parameterSave';
import { applyTypeChoice, applyValidationText, CHECKBOXES_CHOICE, typeChoiceOf, validationError, validationText } from './parameterTypeChoice';
import { ConditionContext, NO_CONDITION_CONTEXT, SHOW_IF_EXAMPLE, SHOW_IF_HELP, showIfError, showIfText, showIfWarning } from './showIfField';

const TYPE_OPTIONS = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'file', label: 'File upload' },
  { value: 'sampleSheet', label: 'Samples spreadsheet' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'dropdown', label: 'Pick from list' },
  { value: CHECKBOXES_CHOICE, label: 'Checkboxes' },
  { value: 'table', label: 'Table' }
];

/**
 * Sortable row in the parameter list. The drag handle is the only listener
 * surface so that clicking the row body still selects the parameter.
 */
function SortableParamRow({
  dragKey,
  label,
  selected,
  onSelect,
  chip
}: {
  dragKey: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
  chip?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dragKey
  });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        backgroundColor: isDragging ? 'action.hover' : undefined,
        borderRadius: 1
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 0.5,
          cursor: 'grab',
          color: 'text.secondary',
          touchAction: 'none',
          '&:active': { cursor: 'grabbing' }
        }}
        aria-label='Drag to reorder parameter'
      >
        <DragIndicatorIcon fontSize='small' />
      </Box>
      <ListItemButton selected={selected} onClick={onSelect} sx={{ flex: 1 }}>
        <ListItemText primary={label} secondary={undefined} />
      </ListItemButton>
      {chip && <Chip size='small' label={chip} sx={{ mr: 1 }} />}
    </Box>
  );
}

export interface ParameterListEditorProps {
  parameters: EditableParameter[];
  setParameters: React.Dispatch<React.SetStateAction<EditableParameter[]>>;
  tableDataText: Record<number, string>;
  setTableDataText: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  canWrite: boolean;
  /** The operation or Parameter Set these parameters are saved on; a samples-spreadsheet template is read back from it. */
  sampleSheetOwner: SampleSheetTemplateOwner;
  /** True ⇒ the id is fixed: renaming no longer re-derives it, and it shows read-only. */
  isIdLocked?: (parameter: EditableParameter) => boolean;
  /** Above the "Parameters" heading in the list pane (e.g. reserved equipment params). */
  listHeader?: React.ReactNode;
  /** Below the "Add parameter" button in the list pane (e.g. set parameters, read-only). */
  listFooter?: React.ReactNode;
  /** A chip label for a row, e.g. "overrides Buffers". */
  rowChip?: (parameter: EditableParameter) => string | undefined;
  /** What "Show only if" references are resolved against, beyond this list: the set being edited and every set. */
  conditionContext?: ConditionContext;
}

export default function ParameterListEditor({
  parameters,
  setParameters,
  tableDataText,
  setTableDataText,
  canWrite,
  sampleSheetOwner,
  isIdLocked,
  listHeader,
  listFooter,
  rowChip,
  conditionContext = NO_CONDITION_CONTEXT
}: ParameterListEditorProps) {
  const [selectedParameterIndex, setSelectedParameterIndex] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setParameters((prev) => {
      const oldIndex = prev.findIndex((p) => p._dragKey === active.id);
      const newIndex = prev.findIndex((p) => p._dragKey === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      const reordered = arrayMove(prev, oldIndex, newIndex);
      // Keep the currently-selected parameter selected after the move.
      setSelectedParameterIndex((current) => {
        const currentKey = prev[current]?._dragKey;
        const nextIndex = reordered.findIndex((p) => p._dragKey === currentKey);
        return nextIndex >= 0 ? nextIndex : current;
      });
      return reordered;
    });
  };

  const updateParameter = (index: number, patch: Record<string, any>) => {
    setParameters((prev) => prev.map((param, i) => (i === index ? { ...param, ...patch } : param)));
  };

  const removeParameter = (index: number) => {
    setParameters((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setSelectedParameterIndex((current) => {
        if (next.length === 0) return 0;
        if (current > index) return current - 1;
        if (current === index) return Math.max(0, current - 1);
        return current;
      });
      return next;
    });
  };

  const addParameter = () => {
    setParameters((prev) => {
      const next = [
        ...prev,
        {
          id: '',
          name: '',
          description: '',
          type: 'string',
          paramType: 'input',
          required: false,
          allowMultipleValues: false,
          isPriceMultiplier: false,
          _dragKey: createDragKey()
        }
      ];
      setSelectedParameterIndex(next.length - 1);
      return next;
    });
  };

  const selectedParameter = parameters[selectedParameterIndex];
  const conditionError = showIfError(parameters, selectedParameterIndex, conditionContext);
  const conditionWarning = showIfWarning(parameters, selectedParameterIndex, conditionContext);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 2 }}>
      <Paper variant='outlined' sx={{ p: 1, maxHeight: { md: '70vh' }, overflow: 'auto' }}>
        <Stack spacing={1}>
          {listHeader}
          <Typography variant='subtitle1' sx={{ px: 1, pt: 1 }}>
            Parameters
          </Typography>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={parameters.map((p) => p._dragKey)} strategy={verticalListSortingStrategy}>
              <List dense disablePadding>
                {parameters.map((parameter, index) => (
                  <SortableParamRow
                    key={parameter._dragKey}
                    dragKey={parameter._dragKey}
                    label={parameter.name?.trim() ? parameter.name : 'Untitled parameter'}
                    selected={selectedParameterIndex === index}
                    onSelect={() => setSelectedParameterIndex(index)}
                    chip={rowChip?.(parameter)}
                  />
                ))}
              </List>
            </SortableContext>
          </DndContext>
          <Box sx={{ p: 1 }}>
            <Button fullWidth variant='outlined' startIcon={<AddIcon />} onClick={addParameter}>
              Add parameter
            </Button>
          </Box>
          {listFooter}
        </Stack>
      </Paper>

      <Paper variant='outlined' sx={{ p: 2 }}>
        {!selectedParameter ? (
          <Typography color='text.secondary'>No parameters yet. Add a parameter to begin.</Typography>
        ) : (
          <Stack spacing={2}>
            <Stack direction='row' alignItems='center' justifyContent='space-between'>
              <Typography variant='h6'>
                {selectedParameter.name?.trim() ? selectedParameter.name : 'Untitled parameter'}
              </Typography>
              <IconButton aria-label='Remove parameter' onClick={() => removeParameter(selectedParameterIndex)}>
                <DeleteIcon />
              </IconButton>
            </Stack>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label='Name'
                  fullWidth
                  required
                  value={selectedParameter.name ?? ''}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    const currentName = selectedParameter.name ?? '';
                    const currentId = String(selectedParameter.id ?? '');
                    const currentDerived = idFromName(currentName);
                    const locked = isIdLocked?.(selectedParameter) === true;
                    const shouldUpdateId = !locked && (currentId.trim() === '' || currentId === currentDerived);
                    updateParameter(selectedParameterIndex, {
                      name: nextName,
                      ...(shouldUpdateId ? { id: idFromName(nextName) } : {})
                    });
                  }}
                />
              </Grid>
              {isIdLocked?.(selectedParameter) && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label='Parameter id'
                    fullWidth
                    value={selectedParameter.id ?? ''}
                    InputProps={{ readOnly: true }}
                    helperText='Fixed once saved: recorded job answers are keyed by it.'
                  />
                </Grid>
              )}
              <Grid size={12}>
                <TextField
                  label='Description'
                  fullWidth
                  value={selectedParameter.description ?? ''}
                  onChange={(event) => updateParameter(selectedParameterIndex, { description: event.target.value })}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label='Show only if'
                  fullWidth
                  placeholder={SHOW_IF_EXAMPLE}
                  value={showIfText(parameters, selectedParameterIndex, conditionContext)}
                  error={Boolean(conditionError)}
                  helperText={conditionError ?? conditionWarning ?? SHOW_IF_HELP}
                  FormHelperTextProps={conditionWarning && !conditionError ? { sx: { color: 'warning.main' } } : undefined}
                  onChange={(event) => updateParameter(selectedParameterIndex, { _showIfText: event.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  label='Answer format'
                  fullWidth
                  value={typeChoiceOf(selectedParameter)}
                  onChange={(event) => updateParameter(selectedParameterIndex, applyTypeChoice(event.target.value))}
                >
                  {TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  label='Required?'
                  fullWidth
                  value={selectedParameter.required ? 'yes' : 'no'}
                  onChange={(event) =>
                    updateParameter(selectedParameterIndex, {
                      required: event.target.value === 'yes'
                    })
                  }
                >
                  <MenuItem value='yes'>Yes</MenuItem>
                  <MenuItem value='no'>No</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  label='Allow multiple selections?'
                  fullWidth
                  disabled={typeChoiceOf(selectedParameter) === CHECKBOXES_CHOICE}
                  helperText={typeChoiceOf(selectedParameter) === CHECKBOXES_CHOICE ? 'Checkboxes always allow several.' : undefined}
                  value={selectedParameter.allowMultipleValues ? 'yes' : 'no'}
                  onChange={(event) =>
                    updateParameter(selectedParameterIndex, {
                      allowMultipleValues: event.target.value === 'yes'
                    })
                  }
                >
                  <MenuItem value='yes'>Yes</MenuItem>
                  <MenuItem value='no'>No</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label='Fallback price'
                  type='number'
                  inputProps={{ min: 0, step: '0.01' }}
                  fullWidth
                  value={selectedParameter.price ?? ''}
                  onChange={(event) =>
                    updateParameter(selectedParameterIndex, {
                      price: event.target.value === '' ? undefined : Number(event.target.value)
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label='Internal price'
                  type='number'
                  inputProps={{ min: 0, step: '0.01' }}
                  fullWidth
                  value={selectedParameter.internalPrice ?? ''}
                  onChange={(event) =>
                    updateParameter(selectedParameterIndex, {
                      internalPrice: event.target.value === '' ? undefined : Number(event.target.value)
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label='External customer (academic)'
                  type='number'
                  inputProps={{ min: 0, step: '0.01' }}
                  fullWidth
                  value={selectedParameter.externalAcademicPrice ?? selectedParameter.pricing?.externalAcademic ?? ''}
                  onChange={(event) =>
                    updateParameter(selectedParameterIndex, {
                      externalAcademicPrice: event.target.value === '' ? undefined : Number(event.target.value)
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label='External customer (market)'
                  type='number'
                  inputProps={{ min: 0, step: '0.01' }}
                  fullWidth
                  value={
                    selectedParameter.externalMarketPrice ??
                    selectedParameter.pricing?.externalMarket ??
                    selectedParameter.externalPrice ??
                    ''
                  }
                  onChange={(event) =>
                    updateParameter(selectedParameterIndex, {
                      externalMarketPrice: event.target.value === '' ? undefined : Number(event.target.value),
                      externalPrice: event.target.value === '' ? undefined : Number(event.target.value)
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label='External customer (no salary)'
                  type='number'
                  inputProps={{ min: 0, step: '0.01' }}
                  fullWidth
                  value={selectedParameter.externalNoSalaryPrice ?? selectedParameter.pricing?.externalNoSalary ?? ''}
                  onChange={(event) =>
                    updateParameter(selectedParameterIndex, {
                      externalNoSalaryPrice: event.target.value === '' ? undefined : Number(event.target.value)
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  label='Price note shown to customer'
                  fullWidth
                  value={selectedParameter.pricingExplanation ?? ''}
                  onChange={(event) =>
                    updateParameter(selectedParameterIndex, {
                      pricingExplanation: event.target.value
                    })
                  }
                />
              </Grid>

              {(selectedParameter.type === 'string' || selectedParameter.type === 'number') && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label='Starting value'
                    fullWidth
                    type={selectedParameter.type === 'number' ? 'number' : 'text'}
                    value={selectedParameter.defaultValue ?? ''}
                    onChange={(event) =>
                      updateParameter(selectedParameterIndex, {
                        defaultValue:
                          event.target.value === ''
                            ? undefined
                            : selectedParameter.type === 'number'
                              ? Number(event.target.value)
                              : event.target.value
                      })
                    }
                  />
                </Grid>
              )}

              {selectedParameter.type === 'number' && (
                <>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      select
                      label='Use as price multiplier?'
                      fullWidth
                      helperText='When enabled, this numeric value multiplies the calculated service price.'
                      value={selectedParameter.isPriceMultiplier ? 'yes' : 'no'}
                      onChange={(event) =>
                        updateParameter(selectedParameterIndex, {
                          isPriceMultiplier: event.target.value === 'yes'
                        })
                      }
                    >
                      <MenuItem value='yes'>Yes</MenuItem>
                      <MenuItem value='no'>No</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label='Validation'
                      fullWidth
                      placeholder='>0 && <100 && integer'
                      value={validationText(selectedParameter)}
                      error={Boolean(validationError(selectedParameter))}
                      helperText={validationError(selectedParameter) ?? 'Rules joined by &&: >n, >=n, <n, <=n, integer. Leave blank for none.'}
                      onChange={(event) => updateParameter(selectedParameterIndex, applyValidationText(event.target.value))}
                    />
                  </Grid>
                </>
              )}

              {selectedParameter.type === 'dropdown' && (
                <Grid size={12}>
                  <Stack spacing={1}>
                    <Typography variant='subtitle1'>Choices</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Prices are per customer category, matching the service-level pricing fields.
                      Leave a category blank to charge the fallback price for it.
                    </Typography>
                    {(selectedParameter.options ?? []).map((option: any, optionIndex: number) => {
                      const patchOption = (patch: Record<string, any>) => {
                        const nextOptions = [...(selectedParameter.options ?? [])];
                        nextOptions[optionIndex] = {
                          ...nextOptions[optionIndex],
                          id: nextOptions[optionIndex]?.id || createDragKey(),
                          ...patch
                        };
                        updateParameter(selectedParameterIndex, { options: nextOptions });
                      };

                      // Writes both the flat field and the nested `pricing` entry, and keeps
                      // the legacy generic `external*` in step with market -- mirroring how
                      // service-level pricing is persisted in AdminEditService.tsx.
                      const patchPrice = (
                        field: 'price' | 'internalPrice' | 'externalAcademicPrice' | 'externalMarketPrice' | 'externalNoSalaryPrice',
                        pricingKey: 'legacy' | 'internal' | 'externalAcademic' | 'externalMarket' | 'externalNoSalary',
                        rawValue: string
                      ) => {
                        const value = rawValue === '' ? undefined : Number(rawValue);
                        const patch: Record<string, any> = {
                          [field]: value,
                          pricing: { ...(option.pricing ?? {}), [pricingKey]: value }
                        };
                        if (field === 'externalMarketPrice') {
                          patch.externalPrice = value;
                          patch.pricing.external = value;
                        }
                        patchOption(patch);
                      };

                      const priceValue = (field: string, pricingKey: string, legacyFallback?: unknown) =>
                        option[field] ?? option.pricing?.[pricingKey] ?? legacyFallback ?? '';

                      return (
                        <Box
                          key={`${option.id || 'option'}-${optionIndex}`}
                          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}
                        >
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1 }}>
                            <TextField
                              label='Choice label'
                              value={option.name ?? ''}
                              onChange={(event) => patchOption({ name: event.target.value })}
                            />
                            <IconButton
                              aria-label='Remove choice'
                              onClick={() => {
                                const nextOptions = (selectedParameter.options ?? []).filter(
                                  (_: any, i: number) => i !== optionIndex
                                );
                                updateParameter(selectedParameterIndex, { options: nextOptions });
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(5, 1fr)',
                              gap: 1,
                              mt: 1.5
                            }}
                          >
                            <TextField
                              label='Fallback price'
                              type='number'
                              size='small'
                              value={priceValue('price', 'legacy')}
                              onChange={(event) => patchPrice('price', 'legacy', event.target.value)}
                            />
                            <TextField
                              label='Internal price'
                              type='number'
                              size='small'
                              value={priceValue('internalPrice', 'internal')}
                              onChange={(event) => patchPrice('internalPrice', 'internal', event.target.value)}
                            />
                            <TextField
                              label='External customer (academic)'
                              type='number'
                              size='small'
                              value={priceValue('externalAcademicPrice', 'externalAcademic')}
                              onChange={(event) => patchPrice('externalAcademicPrice', 'externalAcademic', event.target.value)}
                            />
                            <TextField
                              label='External customer (market)'
                              type='number'
                              size='small'
                              // Pre-migration choices carried market pricing in the generic
                              // `externalPrice`, so fall back to it for display.
                              value={priceValue('externalMarketPrice', 'externalMarket', option.externalPrice)}
                              onChange={(event) => patchPrice('externalMarketPrice', 'externalMarket', event.target.value)}
                            />
                            <TextField
                              label='External customer (no salary)'
                              type='number'
                              size='small'
                              value={priceValue('externalNoSalaryPrice', 'externalNoSalary')}
                              onChange={(event) => patchPrice('externalNoSalaryPrice', 'externalNoSalary', event.target.value)}
                            />
                          </Box>
                        </Box>
                      );
                    })}
                    <Box>
                      <Button
                        variant='outlined'
                        size='small'
                        onClick={() =>
                          updateParameter(selectedParameterIndex, {
                            options: [...(selectedParameter.options ?? []), { id: createDragKey(), name: '' }]
                          })
                        }
                      >
                        Add choice
                      </Button>
                    </Box>
                  </Stack>
                </Grid>
              )}

              {selectedParameter.type === 'sampleSheet' && (
                <Grid size={12}>
                  <SampleSheetTemplateField
                    owner={sampleSheetOwner}
                    parameter={selectedParameter}
                    canWrite={canWrite}
                    onChange={(patch) => updateParameter(selectedParameterIndex, patch)}
                  />
                </Grid>
              )}

              {selectedParameter.type === 'table' && (
                <Grid size={12}>
                  <TextField
                    label='Table setup (JSON)'
                    multiline
                    minRows={6}
                    fullWidth
                    value={
                      tableDataText[selectedParameterIndex] ??
                      (selectedParameter.tableData ? JSON.stringify(selectedParameter.tableData, null, 2) : '')
                    }
                    onChange={(event) =>
                      setTableDataText((prev) => ({
                        ...prev,
                        [selectedParameterIndex]: event.target.value
                      }))
                    }
                  />
                </Grid>
              )}
            </Grid>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
