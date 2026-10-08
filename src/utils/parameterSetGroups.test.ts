import { describe, expect, it } from 'vitest';
import { parameterSetHeadings } from './parameterSetGroups';

describe('parameterSetHeadings (pin 9)', () => {
  const definitions = [{ id: 'cycles' }, { id: 'buffer', fromParameterSetName: 'Buffers' }, { id: 'volume', fromParameterSetName: 'Buffers' }, { id: 'kit', fromParameterSetName: 'Cleanup' }];

  it('puts a heading on the first parameter of each set run', () => {
    const formData = [{ id: 'cycles' }, { id: 'buffer' }, { id: 'volume' }, { id: 'kit' }];
    expect(parameterSetHeadings(formData, definitions)).toEqual([null, 'Buffers', null, 'Cleanup']);
  });

  it('ignores form entries with no definition (run count, equipment) and tolerates no definitions', () => {
    expect(parameterSetHeadings([{ id: 'runCount' }, { id: 'buffer' }], definitions)).toEqual([null, 'Buffers']);
    expect(parameterSetHeadings([{ id: 'buffer' }], undefined)).toEqual([null]);
  });

  it('F19: an “Other” text entry sits in its parameter’s run, so the heading is not drawn twice', () => {
    const formData = [{ id: 'buffer' }, { id: 'buffer__otherText' }, { id: 'volume' }, { id: 'kit' }, { id: 'kit__otherText' }];
    expect(parameterSetHeadings(formData, definitions)).toEqual(['Buffers', null, null, 'Cleanup', null]);
  });

  it('F19: the companion of a parameter outside any set breaks no run and gets no heading', () => {
    expect(parameterSetHeadings([{ id: 'cycles' }, { id: 'cycles__otherText' }, { id: 'buffer' }], definitions)).toEqual([null, null, 'Buffers']);
  });
});
