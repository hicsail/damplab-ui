import React from 'react';
import { Box, MenuItem, Select, Typography } from '@mui/material';

/**
 * The text blocks available for one prose section.
 *
 * Kept out of SowFieldSourceControls, which switches on fieldKey to build the
 * controls behind the six generated sections. This applies uniformly to every
 * prose section, so folding it in would mean eleven identical cases.
 *
 * Choosing a block copies its words in. Nothing records which one was chosen —
 * the document is not a live link to the library, so a block that is later
 * renamed, rewritten or deleted leaves this SOW exactly as it was. That is also
 * why the dropdown reads "Custom text" rather than restoring a selection: after
 * a reload the SOW knows what it says, not where the words came from.
 */

export interface SowTextPresetOption {
  id: string;
  sectionKey: string;
  name: string;
  text: string;
  updatedAt?: string | null;
  updatedByName?: string | null;
}

interface Props {
  presets: SowTextPresetOption[];
  /** The section's current text, used to show which block (if any) matches it. */
  value: string;
  /** What the section was generated with — the block Recalculate returns to. */
  baseline?: string;
  disabled?: boolean;
  onSelect: (text: string) => void;
}

const labelSx = { display: 'block', mb: 0.5, color: 'text.secondary', fontWeight: 500 } as const;

export function presetSubtitle(preset: SowTextPresetOption): string {
  if (!preset.updatedAt) return 'Never edited';
  const when = new Date(preset.updatedAt).toLocaleDateString();
  return preset.updatedByName ? `Edited ${when} by ${preset.updatedByName}` : `Edited ${when}`;
}

/**
 * What choosing a block does to the section.
 *
 * isOverridden is derived, not declared — the server recomputes it the same way
 * on save (see baselineValue in sow-field-calculator.ts). So picking the block
 * the SOW was generated with clears the "Edited" marker rather than setting it,
 * and picking any other block sets it. Both are honest: the marker means the text
 * differs from what this document generated, which after a swap it does.
 */
export function presetSelectionPatch(text: string, baseline?: string | null): { value: string; isOverridden: boolean } {
  return { value: text, isOverridden: text !== (baseline ?? '') };
}

/** The block whose text the section currently shows, if any does. */
export function matchingPresetId(presets: SowTextPresetOption[], value: string): string {
  return presets.find((p) => p.text === value)?.id ?? '';
}

export default function SowPresetPicker({ presets, value, baseline, disabled, onSelect }: Props): React.JSX.Element | null {
  if (presets.length === 0) return null;

  const selectedId = matchingPresetId(presets, value);

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={labelSx}>
        Standard text
      </Typography>
      <Select
        size="small"
        fullWidth
        displayEmpty
        sx={{ maxWidth: 480 }}
        value={selectedId}
        disabled={disabled}
        inputProps={{ 'aria-label': 'Standard text block for this section' }}
        renderValue={(id) => (id ? presets.find((p) => p.id === id)?.name ?? 'Custom text' : 'Custom text')}
        onChange={(e) => {
          const chosen = presets.find((p) => p.id === String(e.target.value));
          if (chosen) onSelect(chosen.text);
        }}
      >
        {/* Present so the dropdown can *show* a hand-edited section honestly, but
            not selectable: there is no "custom text" to switch back to that the
            section is not already displaying. Recalculate is what undoes a choice. */}
        {!selectedId && (
          <MenuItem value="" disabled>
            <em>Custom text</em>
          </MenuItem>
        )}
        {presets.map((preset, i) => (
          <MenuItem key={preset.id} value={preset.id}>
            <Box>
              <Typography variant="body2">
                {preset.name}
                {i === 0 && ' — default'}
                {baseline !== undefined && preset.text === baseline && i !== 0 && ' — this SOW was written with this'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {presetSubtitle(preset)}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
