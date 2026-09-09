import { describe, it, expect } from 'vitest';
import { buildNodeParameters, generateFormDataFromParams, serviceAllowsMultipleRuns } from './ReactFlowEvents';
import { RUN_COUNT_PARAM_ID } from '../utils/servicePricing';
import { EQUIPMENT_PARAM_DEFS, serviceIsEquipmentUse, withEquipmentParams } from './ReactFlowEvents';
import {
  EQUIPMENT_BOOKERS_PARAM_ID,
  EQUIPMENT_END_PARAM_ID,
  EQUIPMENT_HOURS_PER_WEEK_PARAM_ID,
  EQUIPMENT_OPEN_END_PARAM_ID,
  EQUIPMENT_PARAM_IDS,
  EQUIPMENT_START_PARAM_ID
} from '../utils/servicePricing';

const params = [
  { id: 'vol', name: 'Volume', type: 'number', required: true },
  { id: 'buf', name: 'Buffer', type: 'string', required: false }
];

const service = (over: Record<string, any> = {}) => ({ id: 's1', name: 'Gibson Assembly', parameters: params, ...over });

describe('serviceAllowsMultipleRuns', () => {
  it('is off unless the catalogue explicitly turned it on', () => {
    // Opt-in: a service that predates the flag must not start offering run counts.
    expect(serviceAllowsMultipleRuns(service())).toBe(false);
    expect(serviceAllowsMultipleRuns(service({ allowMultipleRuns: false }))).toBe(false);
    expect(serviceAllowsMultipleRuns(service({ allowMultipleRuns: true }))).toBe(true);
  });

  it('does not throw on a missing service', () => {
    expect(serviceAllowsMultipleRuns(undefined)).toBe(false);
    expect(serviceAllowsMultipleRuns(null)).toBe(false);
  });
});

describe('buildNodeParameters', () => {
  it('leaves the run count off a service that does not allow multiple runs', () => {
    const { formData, parameters } = buildNodeParameters(service(), 'n1');

    expect(formData.some((p) => p.id === RUN_COUNT_PARAM_ID)).toBe(false);
    expect(parameters.some((p: any) => p.id === RUN_COUNT_PARAM_ID)).toBe(false);
  });

  it('adds the run count to both the form entries and the parameter list', () => {
    // Both, deliberately: formData is what pricing multiplies by, and parameters
    // is what the sidebar reads to pin the field to the top. Adding it to only
    // one is the bug this helper exists to make unrepresentable.
    const { formData, parameters } = buildNodeParameters(service({ allowMultipleRuns: true }), 'n1');

    expect(formData.find((p) => p.id === RUN_COUNT_PARAM_ID)?.value).toBe(1);
    expect(parameters.find((p: any) => p.id === RUN_COUNT_PARAM_ID)?.isPriceMultiplier).toBe(true);
  });

  it('does not duplicate a run count a service defines for itself', () => {
    const selfDefined = [{ id: RUN_COUNT_PARAM_ID, name: 'Plates', type: 'number', isPriceMultiplier: true }];
    const { formData, parameters } = buildNodeParameters({ parameters: selfDefined, allowMultipleRuns: true }, 'n1');

    expect(formData.filter((p) => p.id === RUN_COUNT_PARAM_ID)).toHaveLength(1);
    expect(parameters.filter((p: any) => p.id === RUN_COUNT_PARAM_ID)).toHaveLength(1);
    // The service's own definition wins — it may be named and priced differently.
    expect(parameters[0].name).toBe('Plates');
  });

  it('keeps the service parameters otherwise untouched', () => {
    const { formData, parameters } = buildNodeParameters(service({ allowMultipleRuns: true }), 'n1');

    expect(parameters.slice(0, 2)).toEqual(params);
    expect(formData.map((p) => p.id)).toEqual(['vol', 'buf', RUN_COUNT_PARAM_ID]);
  });

  it('survives a service with no parameters at all', () => {
    expect(() => buildNodeParameters({ allowMultipleRuns: true }, 'n1')).not.toThrow();
    expect(buildNodeParameters({}, 'n1').formData).toEqual([]);
  });
});

describe('generateFormDataFromParams', () => {
  it('does not inject a run count unless asked', () => {
    expect(generateFormDataFromParams(params, 'n1').some((p) => p.id === RUN_COUNT_PARAM_ID)).toBe(false);
  });

  it('injects one when asked', () => {
    expect(generateFormDataFromParams(params, 'n1', { includeRunCount: true }).some((p) => p.id === RUN_COUNT_PARAM_ID)).toBe(true);
  });
});

describe('serviceIsEquipmentUse', () => {
  it('is off unless the catalog explicitly turned it on', () => {
    expect(serviceIsEquipmentUse(service())).toBe(false);
    expect(serviceIsEquipmentUse(service({ equipmentUse: false }))).toBe(false);
    expect(serviceIsEquipmentUse(service({ equipmentUse: true }))).toBe(true);
    expect(serviceIsEquipmentUse(undefined)).toBe(false);
  });
});

describe('EQUIPMENT_PARAM_DEFS', () => {
  it('is exactly the five reserved parameters, in order, with the pinned labels and types', () => {
    expect(EQUIPMENT_PARAM_DEFS.map((p) => p.id)).toEqual([...EQUIPMENT_PARAM_IDS]);
    expect(EQUIPMENT_PARAM_DEFS.map((p) => [p.id, p.name, p.type, p.required])).toEqual([
      [EQUIPMENT_START_PARAM_ID, 'Start Date', 'date', true],
      [EQUIPMENT_END_PARAM_ID, 'End Date', 'date', true],
      [EQUIPMENT_OPEN_END_PARAM_ID, 'Open End Date?', 'boolean', false],
      [EQUIPMENT_HOURS_PER_WEEK_PARAM_ID, 'Projected Hours per Week', 'number', true],
      [EQUIPMENT_BOOKERS_PARAM_ID, 'Authorized booker emails', 'emails', false]
    ]);
  });

  it('carries no price fields, so the client-facing catalog view is unchanged', () => {
    for (const def of EQUIPMENT_PARAM_DEFS) {
      expect(def.price).toBeUndefined();
      expect(def.pricing).toBeUndefined();
      expect(def.isPriceMultiplier).toBeUndefined();
    }
  });
});

describe('buildNodeParameters — equipment use', () => {
  it('leaves the five off a service that is not equipment use', () => {
    const { formData, parameters } = buildNodeParameters(service(), 'n1');
    for (const id of EQUIPMENT_PARAM_IDS) {
      expect(formData.some((p) => p.id === id)).toBe(false);
      expect(parameters.some((p: any) => p.id === id)).toBe(false);
    }
  });

  it('adds all five to both the form entries and the parameter list', () => {
    const { formData, parameters } = buildNodeParameters(service({ equipmentUse: true }), 'n1');
    expect(formData.map((p) => p.id)).toEqual(['vol', 'buf', ...EQUIPMENT_PARAM_IDS]);
    expect(parameters.map((p: any) => p.id)).toEqual(['vol', 'buf', ...EQUIPMENT_PARAM_IDS]);
  });

  it('seeds the form entries empty, so the required-field check has something to fail on', () => {
    const { formData } = buildNodeParameters(service({ equipmentUse: true }), 'n1');
    const byId = new Map(formData.map((p) => [p.id, p.value]));
    expect(byId.get(EQUIPMENT_START_PARAM_ID)).toBe('');
    expect(byId.get(EQUIPMENT_END_PARAM_ID)).toBe('');
    expect(byId.get(EQUIPMENT_HOURS_PER_WEEK_PARAM_ID)).toBe('');
    expect(byId.get(EQUIPMENT_OPEN_END_PARAM_ID)).toBe(false);
    expect(byId.get(EQUIPMENT_BOOKERS_PARAM_ID)).toEqual([]);
  });

  it('stamps the node id on every injected entry', () => {
    const { formData } = buildNodeParameters(service({ equipmentUse: true }), 'n7');
    for (const id of EQUIPMENT_PARAM_IDS) {
      expect(formData.find((p) => p.id === id)?.nodeId).toBe('n7');
    }
  });

  it('does not duplicate a reserved id a service defines for itself', () => {
    const selfDefined = [{ id: EQUIPMENT_START_PARAM_ID, name: 'Kickoff', type: 'date' }];
    const { formData, parameters } = buildNodeParameters({ parameters: selfDefined, equipmentUse: true }, 'n1');
    expect(formData.filter((p) => p.id === EQUIPMENT_START_PARAM_ID)).toHaveLength(1);
    expect(parameters.filter((p: any) => p.id === EQUIPMENT_START_PARAM_ID)).toHaveLength(1);
    expect(parameters[0].name).toBe('Kickoff');
  });

  it('carries the run count and the equipment params together when both are on', () => {
    const { formData } = buildNodeParameters(service({ equipmentUse: true, allowMultipleRuns: true }), 'n1');
    expect(formData.map((p) => p.id)).toEqual(['vol', 'buf', RUN_COUNT_PARAM_ID, ...EQUIPMENT_PARAM_IDS]);
  });
});

describe('withEquipmentParams', () => {
  it('is a no-op when not asked', () => {
    expect(withEquipmentParams(params, false)).toEqual(params);
  });
});
