import { Box, Button, Checkbox, Chip, FormControlLabel, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useState } from 'react';

/**
 * The item type vocabulary, shared by both inventory forms.
 *
 * `EQUIPMENT` / `HOOD` / `STORAGE` are the canonical values; `ROBOT`, `MACHINE`,
 * `INSTRUMENT` and `OTHER` are deprecated on the backend enum and kept selectable
 * only so an existing record can round-trip through the form without silently
 * changing type. New items default to `EQUIPMENT`, matching the model's default.
 */
export const INVENTORY_TYPE_OPTIONS: { value: string; label: string; deprecated?: boolean }[] = [
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'HOOD', label: 'Hood' },
  { value: 'STORAGE', label: 'Storage' },
  { value: 'CONSUMABLE', label: 'Consumable' },
  { value: 'ROBOT', label: 'Robot (legacy)', deprecated: true },
  { value: 'MACHINE', label: 'Machine (legacy)', deprecated: true },
  { value: 'INSTRUMENT', label: 'Instrument (legacy)', deprecated: true },
  { value: 'OTHER', label: 'Other (legacy)', deprecated: true }
];

export const DEFAULT_INVENTORY_TYPE = 'EQUIPMENT';

/** One editable dimension row. Kept as strings so a half-typed value does not reset. */
export interface DimensionRow {
  value: string;
  unit: string;
}

/** The half of an inventory item that neither form exposed before. */
export interface InventoryDetails {
  modelNumber: string;
  serialNumber: string;
  hasServiceContract: boolean;
  serviceContractExpiration: string;
  tags: string[];
  dimensions: DimensionRow[];
}

export const EMPTY_INVENTORY_DETAILS: InventoryDetails = {
  modelNumber: '',
  serialNumber: '',
  hasServiceContract: false,
  serviceContractExpiration: '',
  tags: [],
  dimensions: []
};

/** Hydrate the detail half of the form from a fetched inventory item. */
export function inventoryDetailsFrom(item: any): InventoryDetails {
  return {
    modelNumber: item?.modelNumber ?? '',
    serialNumber: item?.serialNumber ?? '',
    hasServiceContract: !!item?.hasServiceContract,
    // The model stores a Date; the date input wants YYYY-MM-DD.
    serviceContractExpiration: item?.serviceContractExpiration ? String(item.serviceContractExpiration).slice(0, 10) : '',
    tags: Array.isArray(item?.tags) ? item.tags.map((t: any) => String(t)) : [],
    dimensions: Array.isArray(item?.dimensions)
      ? item.dimensions.filter((d: any) => d).map((d: any) => ({ value: String(d.value ?? ''), unit: String(d.unit ?? '') }))
      : []
  };
}

/**
 * Serialise the detail half for `CreateInventoryItem` / `UpdateInventoryItem`.
 *
 * Both inputs accept every one of these as nullable, so an untouched form sends
 * nothing rather than sending empty strings.
 */
export function inventoryDetailsToInput(details: InventoryDetails) {
  const dimensions = details.dimensions
    .filter((d) => d.value.trim() !== '' && d.unit.trim() !== '')
    .map((d) => ({ value: Number(d.value), unit: d.unit.trim() }))
    .filter((d) => Number.isFinite(d.value));
  return {
    modelNumber: details.modelNumber.trim() || undefined,
    serialNumber: details.serialNumber.trim() || undefined,
    hasServiceContract: details.hasServiceContract,
    serviceContractExpiration: details.serviceContractExpiration ? new Date(details.serviceContractExpiration).toISOString() : undefined,
    tags: details.tags,
    dimensions
  };
}

interface Props {
  details: InventoryDetails;
  setDetails: (d: InventoryDetails) => void;
}

/**
 * Model / serial / service-contract / tags / dimensions editor. These fields
 * shipped on the model in PR #70 but were never added to either form, so they were
 * unreachable from the UI.
 */
export function InventoryDetailFields({ details, setDetails }: Props) {
  const [tagDraft, setTagDraft] = useState('');
  const patch = (changes: Partial<InventoryDetails>) => setDetails({ ...details, ...changes });

  const addTag = () => {
    const tag = tagDraft.trim();
    if (!tag || details.tags.includes(tag)) {
      setTagDraft('');
      return;
    }
    patch({ tags: [...details.tags, tag] });
    setTagDraft('');
  };

  const setDimensionRow = (index: number, change: Partial<DimensionRow>) =>
    patch({ dimensions: details.dimensions.map((row, i) => (i === index ? { ...row, ...change } : row)) });

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
        Identification &amp; service
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <TextField
          label="Model number"
          value={details.modelNumber}
          onChange={(e) => patch({ modelNumber: e.target.value })}
          helperText="Items sharing a model number are the same type of equipment."
        />
        <TextField
          label="Serial number"
          value={details.serialNumber}
          onChange={(e) => patch({ serialNumber: e.target.value })}
          helperText="Internal use only — hidden from non-staff."
        />
      </Box>

      <Box sx={{ mt: 1.5 }}>
        <FormControlLabel
          control={<Checkbox checked={details.hasServiceContract} onChange={(e) => patch({ hasServiceContract: e.target.checked })} />}
          label="Has an active service contract"
        />
        {details.hasServiceContract && (
          <TextField
            label="Service contract expires"
            type="date"
            value={details.serviceContractExpiration}
            onChange={(e) => patch({ serviceContractExpiration: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ display: 'block', mt: 1.5, maxWidth: 260 }}
          />
        )}
      </Box>

      <Typography variant="subtitle1" sx={{ mt: 3, mb: 0.5 }}>
        Tags
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Finer categorisation for filtering (e.g. "Analytical Equipment", "Centrifuge").
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        {details.tags.map((tag) => (
          <Chip key={tag} label={tag} onDelete={() => patch({ tags: details.tags.filter((t) => t !== tag) })} />
        ))}
        {details.tags.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No tags yet.
          </Typography>
        )}
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          label="Add a tag"
          size="small"
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
        />
        <Tooltip title="Add tag">
          <span>
            <IconButton size="small" onClick={addTag} disabled={!tagDraft.trim()}>
              <AddIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Typography variant="subtitle1" sx={{ mt: 3, mb: 0.5 }}>
        Dimensions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Up to three measurements (e.g. 60 cm × 45 cm × 90 cm). Rows missing a value or a unit are
        dropped on save.
      </Typography>
      <Stack spacing={1.5}>
        {details.dimensions.map((row, index) => (
          <Stack key={index} direction="row" spacing={1} alignItems="center">
            <TextField
              label="Value"
              type="number"
              size="small"
              value={row.value}
              onChange={(e) => setDimensionRow(index, { value: e.target.value })}
              inputProps={{ min: 0, step: 'any' }}
              sx={{ width: 140 }}
            />
            <TextField
              label="Unit"
              size="small"
              value={row.unit}
              onChange={(e) => setDimensionRow(index, { unit: e.target.value })}
              placeholder="cm"
              sx={{ width: 140 }}
            />
            <Tooltip title="Remove dimension">
              <IconButton size="small" onClick={() => patch({ dimensions: details.dimensions.filter((_, i) => i !== index) })}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ))}
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => patch({ dimensions: [...details.dimensions, { value: '', unit: '' }] })}
          sx={{ alignSelf: 'flex-start' }}
          disabled={details.dimensions.length >= 3}
        >
          Add dimension
        </Button>
      </Stack>
    </Box>
  );
}
