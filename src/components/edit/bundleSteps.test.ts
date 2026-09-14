import { describe, expect, it } from 'vitest';
import { addStep, createStep, firstEmptyStepIndex, moveStep, removeStep, serviceIdsFromSteps, setStepService, stepsFromServiceIds } from './bundleSteps';

describe('bundle steps', () => {
  it('hydrates stored ids into steps, keeping order', () => {
    const steps = stepsFromServiceIds(['primers', 'pcr', 'gel']);
    expect(serviceIdsFromSteps(steps)).toEqual(['primers', 'pcr', 'gel']);
  });

  it('gives every step a distinct key even when two name the same operation', () => {
    // The whole point of the change: a checkbox set could not say "run PCR
    // twice", and React cannot key those rows on the service id.
    const steps = stepsFromServiceIds(['pcr', 'gel', 'pcr']);
    expect(new Set(steps.map((s) => s.key)).size).toBe(3);
    expect(serviceIdsFromSteps(steps)).toEqual(['pcr', 'gel', 'pcr']);
  });

  it('keeps a repeated operation through add, reorder and save', () => {
    let steps = stepsFromServiceIds(['primers', 'pcr']);
    steps = addStep(steps);
    steps = setStepService(steps, 2, 'pcr');
    steps = moveStep(steps, 2, -1);
    expect(serviceIdsFromSteps(steps)).toEqual(['primers', 'pcr', 'pcr']);
  });

  it('removes by position, not by operation', () => {
    // Removing "the pcr step" by id would have taken both.
    const steps = stepsFromServiceIds(['pcr', 'gel', 'pcr']);
    expect(serviceIdsFromSteps(removeStep(steps, 0))).toEqual(['gel', 'pcr']);
  });

  it('swaps a step with its neighbour', () => {
    const steps = stepsFromServiceIds(['a', 'b', 'c']);
    expect(serviceIdsFromSteps(moveStep(steps, 1, 1))).toEqual(['a', 'c', 'b']);
    expect(serviceIdsFromSteps(moveStep(steps, 1, -1))).toEqual(['b', 'a', 'c']);
  });

  it('treats an out-of-range move as a no-op rather than throwing', () => {
    const steps = stepsFromServiceIds(['a', 'b']);
    expect(serviceIdsFromSteps(moveStep(steps, 0, -1))).toEqual(['a', 'b']);
    expect(serviceIdsFromSteps(moveStep(steps, 1, 1))).toEqual(['a', 'b']);
  });

  it('reports the first step still needing an operation', () => {
    const steps = [createStep('a'), createStep(''), createStep('c')];
    expect(firstEmptyStepIndex(steps)).toBe(1);
    expect(firstEmptyStepIndex(stepsFromServiceIds(['a', 'b']))).toBe(-1);
  });

  it('drops unfilled steps from what gets saved', () => {
    // The save path guards on firstEmptyStepIndex, so this is the second line of
    // defence: a blank id must never reach the mutation.
    expect(serviceIdsFromSteps([createStep('a'), createStep('')])).toEqual(['a']);
  });
});
