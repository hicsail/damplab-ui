import { describe, expect, it } from 'vitest';
import { headerStepIds } from './ProtocolViewer';

describe('headerStepIds', () => {
  it('treats a step with substeps as a section header', () => {
    const steps = [
      { id: 's1', number: '1' },
      { id: 's1.1', number: '1.1' },
      { id: 's1.2', number: '1.2' },
      { id: 's2', number: '2' },
      { id: 's3', number: '3' },
      { id: 's3.1', number: '3.1' }
    ];
    expect([...headerStepIds(steps)]).toEqual(['s1', 's3']);
  });

  it('does not mistake step 1 for the parent of step 10', () => {
    const steps = [
      { id: 'a', number: '1' },
      { id: 'b', number: '10' },
      { id: 'c', number: '10.1' }
    ];
    expect([...headerStepIds(steps)]).toEqual(['b']);
  });
});
