import { describe, expect, it } from 'vitest';
import { suggestedBefore } from './suggestedConnections';

describe('suggestedBefore', () => {
  const services = [
    { id: 'pcr', allowedConnections: [{ id: 'gel', name: 'Gel' }] },
    { id: 'digest', allowedConnections: ['gel'] },
    { id: 'gel', allowedConnections: [{ id: 'gel' }] },
    { id: 'ligation', allowedConnections: null }
  ];

  it('lists every operation that suggests this one next, whichever shape the list is in, itself included', () => {
    expect(suggestedBefore('gel', services).map((s) => s.id)).toEqual(['pcr', 'digest', 'gel']);
  });

  it('is empty when nothing suggests the operation', () => {
    expect(suggestedBefore('ligation', services)).toEqual([]);
  });
});
