import { describe, expect, it } from 'vitest';
import { visiblePaletteBundles, visiblePaletteServices, withoutHidden } from './paletteVisibility';

const services = [
  { id: 'a', name: 'PCR' },
  { id: 'eq', name: 'Plate reader', equipmentUse: true },
  { id: 'old', name: 'Old', hiddenFromClients: true }
];
// GET_BUNDLES returns services as objects — the shape F1 got wrong.
const bundles = [
  { id: 'b1', services: [{ id: 'a' }] },
  { id: 'b2', services: [{ id: 'a' }, { id: 'eq' }] },
  { id: 'b3', services: [{ id: 'old' }] },
  { id: 'b4', services: ['a'] }
];

describe('palette visibility (pins 15, 18, 20)', () => {
  it('a client sees neither equipment-use nor hidden operations', () => {
    expect(visiblePaletteServices(services, { mayUseEquipment: false, showHidden: false }).map((s) => s.id)).toEqual(['a']);
  });

  it('drops any bundle containing a hidden or disallowed operation, comparing ids not objects (F1)', () => {
    expect(visiblePaletteBundles(bundles, services, { mayUseEquipment: false, showHidden: false }).map((b) => b.id)).toEqual(['b1', 'b4']);
    expect(visiblePaletteBundles(bundles, services, { mayUseEquipment: true, showHidden: false }).map((b) => b.id)).toEqual(['b1', 'b2', 'b4']);
  });

  it('shows hidden operations and their bundles when the toggle is on', () => {
    expect(visiblePaletteServices(services, { mayUseEquipment: true, showHidden: true }).map((s) => s.id)).toEqual(['a', 'eq', 'old']);
    expect(visiblePaletteBundles(bundles, services, { mayUseEquipment: true, showHidden: true })).toHaveLength(4);
  });

  it('filters table rows the same way', () => {
    expect(withoutHidden(services, false).map((s) => s.id)).toEqual(['a', 'eq']);
    expect(withoutHidden(services, true)).toHaveLength(3);
  });
});
