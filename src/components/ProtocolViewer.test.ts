import { describe, expect, it } from 'vitest';
import { adjacentStepState, headerStepIds } from './ProtocolViewer';

/** The ids a technician can tick, split out the way ProtocolViewer does. */
function checkableSteps(numbers: string[]) {
  const steps = numbers.map((number) => ({ id: `s${number}`, number }));
  const headers = headerStepIds(steps);
  return steps.filter((s) => !headers.has(s.id));
}

/** Ticks every step the rules allow, one at a time, and returns the order they were ticked in. */
function completeInOrder(numbers: string[]) {
  const checkable = checkableSteps(numbers);
  const done = new Set<string>();
  for (;;) {
    const next = checkable.find((s) => !done.has(s.id) && adjacentStepState(checkable, s.id, done).prevDone);
    if (!next) return { ticked: [...done], total: checkable.length };
    done.add(next.id);
  }
}

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

describe('adjacentStepState', () => {
  it('keeps strict order on a flat protocol', () => {
    const steps = checkableSteps(['1', '2', '3']);

    expect(adjacentStepState(steps, 's1', new Set()).prevDone).toBe(true);
    expect(adjacentStepState(steps, 's2', new Set()).prevDone).toBe(false);
    expect(adjacentStepState(steps, 's2', new Set(['s1'])).prevDone).toBe(true);
    expect(adjacentStepState(steps, 's1', new Set(['s1', 's2'])).nextUndone).toBe(false);
    expect(adjacentStepState(steps, 's3', new Set(['s1', 's2', 's3'])).nextUndone).toBe(true);
    expect(completeInOrder(['1', '2', '3'])).toEqual({ ticked: ['s1', 's2', 's3'], total: 3 });
  });

  it('lets a section header be skipped in both directions', () => {
    const steps = checkableSteps(['1', '1.1', '1.2', '2', '2.1']);

    // Nothing checkable comes before 1.1, so the header above it must not lock it.
    expect(adjacentStepState(steps, 's1.1', new Set()).prevDone).toBe(true);
    // The step before 2.1 is 1.2, not the header "2".
    expect(adjacentStepState(steps, 's2.1', new Set(['s1.1'])).prevDone).toBe(false);
    expect(adjacentStepState(steps, 's2.1', new Set(['s1.1', 's1.2'])).prevDone).toBe(true);
    // Likewise 1.2 cannot be unticked while 2.1, across the header, is still done.
    expect(adjacentStepState(steps, 's1.2', new Set(['s1.1', 's1.2', 's2.1'])).nextUndone).toBe(false);
    expect(completeInOrder(['1', '1.1', '1.2', '2', '2.1'])).toEqual({ ticked: ['s1.1', 's1.2', 's2.1'], total: 3 });
  });

  it('can complete every step of a BCA-style protocol', () => {
    // Numbering of the published Pierce BCA protocol: flat steps either side of sections.
    const numbers = ['1', '2', '3', '3.1', '4', '4.1', '5', '5.1', '5.2', '5.3', '6', '6.1', '6.2', '7'];

    expect(completeInOrder(numbers)).toEqual({
      ticked: ['s1', 's2', 's3.1', 's4.1', 's5.1', 's5.2', 's5.3', 's6.1', 's6.2', 's7'],
      total: 10
    });
  });
});
