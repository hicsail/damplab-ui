import { Box, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';

export interface RatePricing {
  internal: string;
  externalAcademic: string;
  externalMarket: string;
  externalNoSalary: string;
}

export const EMPTY_RATE_PRICING: RatePricing = { internal: '', externalAcademic: '', externalMarket: '', externalNoSalary: '' };

interface Props {
  bookable: boolean;
  setBookable: (b: boolean) => void;
  rateType: 'HOURLY' | 'PER_UNIT';
  setRateType: (t: 'HOURLY' | 'PER_UNIT') => void;
  pricing: RatePricing;
  setPricing: (p: RatePricing) => void;
  /** Item type, used only to suggest a sensible default rate type. */
  itemType?: string;
}

/**
 * Booking + rate editor for an inventory item. Lets staff mark an item bookable
 * and set its rate by customer category — $/hour (machines) or $/unit (consumables).
 */
export function InventoryRateFields({ bookable, setBookable, rateType, setRateType, pricing, setPricing }: Props) {
  const unit = rateType === 'HOURLY' ? '/hr' : '/unit';
  const setField = (key: keyof RatePricing) => (e: React.ChangeEvent<HTMLInputElement>) => setPricing({ ...pricing, [key]: e.target.value });

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
      <FormControlLabel
        control={<Checkbox checked={bookable} onChange={(e) => setBookable(e.target.checked)} />}
        label="Users can book this item"
      />
      {bookable && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Machines are booked for a time slot and billed by the hour; consumables are booked by quantity and billed per unit. Set the rate per customer category — leave blank if not billed for that category.
          </Typography>
          <FormControl sx={{ mb: 2, minWidth: 220 }}>
            <InputLabel id="inventory-rate-type-label">Billed</InputLabel>
            <Select labelId="inventory-rate-type-label" value={rateType} label="Billed" onChange={(e) => setRateType(e.target.value as 'HOURLY' | 'PER_UNIT')}>
              <MenuItem value="HOURLY">By the hour ($/hr)</MenuItem>
              <MenuItem value="PER_UNIT">Per unit ($/unit)</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
            <TextField label={`Internal rate (${unit})`} value={pricing.internal} onChange={setField('internal')} type="number" inputProps={{ min: 0, step: '0.01' }} />
            <TextField label={`External academic (${unit})`} value={pricing.externalAcademic} onChange={setField('externalAcademic')} type="number" inputProps={{ min: 0, step: '0.01' }} />
            <TextField label={`External market (${unit})`} value={pricing.externalMarket} onChange={setField('externalMarket')} type="number" inputProps={{ min: 0, step: '0.01' }} />
            <TextField label={`External no-salary (${unit})`} value={pricing.externalNoSalary} onChange={setField('externalNoSalary')} type="number" inputProps={{ min: 0, step: '0.01' }} />
          </Box>
        </Box>
      )}
    </Box>
  );
}

/** Build the GraphQL Pricing input from the string-based form state (numbers or null). */
export function ratePricingToInput(p: RatePricing): Record<string, number | null> {
  const num = (v: string): number | null => {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  return {
    internal: num(p.internal),
    externalAcademic: num(p.externalAcademic),
    externalMarket: num(p.externalMarket),
    externalNoSalary: num(p.externalNoSalary)
  };
}

/** Parse a server Pricing object back into form state. */
export function pricingToRateForm(pricing: any): RatePricing {
  const s = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
  return {
    internal: s(pricing?.internal),
    externalAcademic: s(pricing?.externalAcademic),
    externalMarket: s(pricing?.externalMarket),
    externalNoSalary: s(pricing?.externalNoSalary)
  };
}
