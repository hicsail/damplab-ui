import { describe, it, expect } from 'vitest';
import { buildNodeParameters, generateFormDataFromParams, serviceAllowsMultipleRuns } from './ReactFlowEvents';
import { RUN_COUNT_PARAM_ID } from '../utils/servicePricing';

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
