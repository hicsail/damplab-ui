import { Autocomplete, Box, Checkbox, Chip, FormControlLabel, Stack, TextField, Typography } from '@mui/material';

/**
 * The item type vocabulary, shared by both inventory forms.
 *
 * **Suggestions, not a closed list.** The model relaxed `type` from an enum to a
 * free string, so the forms offer these and accept anything. `ROBOT`, `MACHINE`,
 * `INSTRUMENT` and `OTHER` are legacy values kept here so an existing record still
 * shows a readable label rather than a bare token.
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

/** What the type picker offers. Legacy values are reachable by typing, not by picking. */
export const SUGGESTED_INVENTORY_TYPES = INVENTORY_TYPE_OPTIONS.filter((o) => !o.deprecated).map((o) => o.value);

export const DEFAULT_INVENTORY_TYPE = 'EQUIPMENT';

/** Common tags, offered as completions. Free text is still accepted. */
export const TAG_SUGGESTIONS = [
  'Analytical Equipment',
  'CLIA Equipment',
  'Centrifuge',
  'Cold Storage',
  'General Equipment',
  'Imaging',
  'Incubator',
  'Liquid Handler',
  'Sequencer',
  'Vortexer'
];

/**
 * One dimension. Held as strings so a half-typed value does not reset under you.
 *
 * The unit rides along per dimension because the model stores one — but it defaults
 * to metres, which is what the spreadsheet import writes and what the grid's
 * "L (m)" headers assume.
 */
export interface DimensionRow {
  value: string;
  unit: string;
}

const emptyDimension = (): DimensionRow => ({ value: '', unit: 'm' });

/** The half of an inventory item that neither form exposed before. */
export interface InventoryDetails {
  modelNumber: string;
  serialNumber: string;
  hasServiceContract: boolean;
  serviceContractExpiration: string;
  tags: string[];
  dimensionL: DimensionRow;
  dimensionW: DimensionRow;
  dimensionH: DimensionRow;
}

export const EMPTY_INVENTORY_DETAILS: InventoryDetails = {
  modelNumber: '',
  serialNumber: '',
  hasServiceContract: false,
  serviceContractExpiration: '',
  tags: [],
  dimensionL: emptyDimension(),
  dimensionW: emptyDimension(),
  dimensionH: emptyDimension()
};

const dimensionFrom = (d: any): DimensionRow => ({
  value: d?.value === undefined || d?.value === null ? '' : String(d.value),
  unit: String(d?.unit ?? 'm')
});

/** Hydrate the detail half of the form from a fetched inventory item. */
export function inventoryDetailsFrom(item: any): InventoryDetails {
  return {
    modelNumber: item?.modelNumber ?? '',
    serialNumber: item?.serialNumber ?? '',
    hasServiceContract: !!item?.hasServiceContract,
    // The model stores a Date; the date input wants YYYY-MM-DD.
    serviceContractExpiration: item?.serviceContractExpiration ? String(item.serviceContractExpiration).slice(0, 10) : '',
    tags: Array.isArray(item?.tags) ? item.tags.map((t: any) => String(t)) : [],
    dimensionL: dimensionFrom(item?.dimensionL),
    dimensionW: dimensionFrom(item?.dimensionW),
    dimensionH: dimensionFrom(item?.dimensionH)
  };
}

const dimensionToInput = (row: DimensionRow): { value: number; unit: string } | undefined => {
  if (row.value.trim() === '') return undefined;
  const value = Number(row.value);
  if (!Number.isFinite(value)) return undefined;
  return { value, unit: row.unit.trim() || 'm' };
};

/**
 * Serialise the detail half for `CreateInventoryItem` / `InventoryItemChange`.
 *
 * `clearEmpty` is the difference between the two forms, and it matters. The update
 * mutation hands its input straight to `updateOne`, so an **omitted** key leaves the
 * stored value alone while an explicit **null** clears it. On create, omitting is
 * right — there is nothing to clear. On edit, omitting would make "delete this
 * serial number" a silent no-op, so the edit form passes `clearEmpty` and empty
 * fields go over as null.
 */
export function inventoryDetailsToInput(details: InventoryDetails, { clearEmpty = false }: { clearEmpty?: boolean } = {}) {
  const blank = clearEmpty ? null : undefined;
  return {
    modelNumber: details.modelNumber.trim() || blank,
    serialNumber: details.serialNumber.trim() || blank,
    hasServiceContract: details.hasServiceContract,
    serviceContractExpiration: details.serviceContractExpiration ? new Date(details.serviceContractExpiration).toISOString() : blank,
    tags: details.tags,
    dimensionL: dimensionToInput(details.dimensionL) ?? blank,
    dimensionW: dimensionToInput(details.dimensionW) ?? blank,
    dimensionH: dimensionToInput(details.dimensionH) ?? blank
  };
}

/** The type picker, free-text with suggestions — `type` is a free string on the model. */
export function InventoryTypePicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <Autocomplete
      freeSolo
      options={SUGGESTED_INVENTORY_TYPES}
      value={value}
      onChange={(_, next) => onChange(typeof next === 'string' ? next : '')}
      onInputChange={(_, next) => onChange(next)}
      renderInput={(params) => <TextField {...params} label='Type' helperText='Pick one or type your own.' />}
    />
  );
}

interface Props {
  details: InventoryDetails;
  setDetails: (d: InventoryDetails) => void;
}

/**
 * Model / serial / service-contract / tags / dimensions editor, shared by the new
 * and edit inventory forms. These fields shipped on the model but were never added
 * to either form, so they were unreachable from the UI.
 */
export function InventoryDetailFields({ details, setDetails }: Props) {
  const patch = (changes: Partial<InventoryDetails>) => setDetails({ ...details, ...changes });

  const dimensionField = (key: 'dimensionL' | 'dimensionW' | 'dimensionH', label: string) => (
    <Stack direction='row' spacing={1} alignItems='center' key={key}>
      <TextField
        label={label}
        type='number'
        size='small'
        value={details[key].value}
        onChange={(e) => patch({ [key]: { ...details[key], value: e.target.value } } as Partial<InventoryDetails>)}
        inputProps={{ min: 0, step: 'any' }}
        sx={{ width: 140 }}
      />
      <TextField
        label='Unit'
        size='small'
        value={details[key].unit}
        onChange={(e) => patch({ [key]: { ...details[key], unit: e.target.value } } as Partial<InventoryDetails>)}
        placeholder='m'
        sx={{ width: 100 }}
      />
    </Stack>
  );

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
      <Typography variant='subtitle1' sx={{ mb: 1.5 }}>
        Identification &amp; service
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <TextField
          label='Model number'
          value={details.modelNumber}
          onChange={(e) => patch({ modelNumber: e.target.value })}
          helperText='Items sharing a model number are the same type of equipment.'
        />
        <TextField
          label='Serial number'
          value={details.serialNumber}
          onChange={(e) => patch({ serialNumber: e.target.value })}
          helperText='Internal use only — hidden from anyone without internal-fields:read.'
        />
      </Box>

      <Box sx={{ mt: 1.5 }}>
        <FormControlLabel
          control={<Checkbox checked={details.hasServiceContract} onChange={(e) => patch({ hasServiceContract: e.target.checked })} />}
          label='Has an active service contract'
        />
        {details.hasServiceContract && (
          <TextField
            label='Service contract expires'
            type='date'
            value={details.serviceContractExpiration}
            onChange={(e) => patch({ serviceContractExpiration: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ display: 'block', mt: 1.5, maxWidth: 260 }}
          />
        )}
      </Box>

      <Typography variant='subtitle1' sx={{ mt: 3, mb: 0.5 }}>
        Tags
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
        Finer categorisation for filtering. Pick from the list or type your own.
      </Typography>
      <Autocomplete
        multiple
        freeSolo
        options={TAG_SUGGESTIONS}
        value={details.tags}
        onChange={(_, next) => patch({ tags: (next as string[]).map((t) => t.trim()).filter(Boolean) })}
        renderTags={(value, getTagProps) => value.map((tag, index) => <Chip {...getTagProps({ index })} key={tag} label={tag} />)}
        renderInput={(params) => <TextField {...params} label='Tags' placeholder='Add a tag' />}
      />

      <Typography variant='subtitle1' sx={{ mt: 3, mb: 0.5 }}>
        Dimensions
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
        Length, width and height. Leave a measurement blank if you do not have it — blanks are not saved.
      </Typography>
      <Stack spacing={1.5}>
        {dimensionField('dimensionL', 'Length')}
        {dimensionField('dimensionW', 'Width')}
        {dimensionField('dimensionH', 'Height')}
      </Stack>
    </Box>
  );
}
