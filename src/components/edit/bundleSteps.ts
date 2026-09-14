/**
 * A bundle's operations as an ordered list of steps.
 *
 * The stored shape does not change: a bundle is still a flat array of service
 * ids in order, which is what the backend keeps (`Bundle.services`) and what
 * `DampLabServices.findByIds` already resolves order- and duplicate-preserving.
 * What changes is the editor's model of it. A set you tick became a sequence you
 * build, so one operation can occupy more than one step — nothing but the
 * multi-select picker ever prevented that.
 *
 * A step carries a `key` beside its `serviceId` because two steps may now hold
 * the same id, and React cannot tell those rows apart by value. Keys are local
 * to the editing session and are never sent to the server.
 */
export interface BundleStep {
  key: string;
  serviceId: string;
}

/** Monotonic within the module — unique per session is all a React key needs. */
let nextKey = 0;

export function createStep(serviceId = ''): BundleStep {
  nextKey += 1;
  return { key: `step-${nextKey}`, serviceId };
}

/** Hydrate the editor from stored ids. A blank id is kept: it is an unfinished step, not an absent one. */
export function stepsFromServiceIds(serviceIds: readonly string[] | null | undefined): BundleStep[] {
  return (serviceIds ?? []).map((serviceId) => createStep(String(serviceId)));
}

/** What gets saved. Steps still being filled in are dropped rather than sent as empty ids. */
export function serviceIdsFromSteps(steps: readonly BundleStep[]): string[] {
  return steps.map((step) => step.serviceId).filter((serviceId) => serviceId !== '');
}

export function addStep(steps: readonly BundleStep[]): BundleStep[] {
  return [...steps, createStep()];
}

export function removeStep(steps: readonly BundleStep[], index: number): BundleStep[] {
  if (index < 0 || index >= steps.length) return [...steps];
  return steps.filter((_step, i) => i !== index);
}

/**
 * Swap a step with its neighbour. Out-of-range moves are a no-op rather than an
 * error — the buttons are disabled at the ends, and a race should not throw.
 */
export function moveStep(steps: readonly BundleStep[], index: number, direction: -1 | 1): BundleStep[] {
  const next = [...steps];
  const target = index + direction;
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Point a step at an operation.
 *
 * Deliberately does not check whether another step already holds that id: two
 * steps naming the same operation is the whole point of the change.
 */
export function setStepService(steps: readonly BundleStep[], index: number, serviceId: string): BundleStep[] {
  if (index < 0 || index >= steps.length) return [...steps];
  return steps.map((step, i) => (i === index ? { ...step, serviceId } : step));
}

/** The first step with nothing chosen yet, or -1 when every step is filled in. */
export function firstEmptyStepIndex(steps: readonly BundleStep[]): number {
  return steps.findIndex((step) => step.serviceId === '');
}
