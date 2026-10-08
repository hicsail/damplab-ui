import type { WorkbookPlan } from './planWorkbook';
import { planOwnerParameters, setReservations } from './parameterListSheet';
import type { CatalogSnapshot } from './types';

/**
 * Rules 17 and 20: two parameters of one operation must never share an id.
 *
 * An operation's own parameter wins over a set's parameter of the same id, so a
 * collision makes the set's parameter silently vanish from that operation's
 * form. An own parameter this upload creates cannot collide: its id is minted
 * against the operation's resulting sets (buildOwnerParameters). What cannot be
 * avoided is a parameter this upload creates *in a set* whose minted id is an id
 * already used by the own parameters of an operation that uses the set. That
 * row is refused, with the clash message the server uses for two sets sharing
 * an id. A set parameter's id is minted clear of the own parameters the plan
 * knew of (reserveAcrossSets), so this is what is left when the catalog has
 * moved since.
 *
 * Two *sets* of one operation sharing an id is what the server refuses the
 * operation for. Ids this upload mints avoid it (setReservations). Two ids
 * already stored cannot: the Operations row that would put both sets on one
 * operation — a create, or an update that changes its sets — is refused, with
 * the server's message.
 *
 * A collision already stored is left alone: only rows of this upload are ever
 * refused.
 */

const message = (parameterId: string, operationName: string, setName: string): string => `Parameter id "${parameterId}" is in both "${operationName}" and "${setName}".`;

/**
 * The set-parameter create rows and the Operations rows (by row key) that would collide, with their message.
 * `candidate` is the rows being applied — all the error-free rows when planning,
 * the ticked ones when applying. Refusing a row can change the ids minted for the
 * rows after it, so this repeats until nothing new is refused.
 */
export function findIdClashes(plan: WorkbookPlan, catalog: CatalogSnapshot, candidate: ReadonlySet<string>): Record<string, string> {
  const refused: Record<string, string> = {};
  for (;;) {
    const live = new Set([...candidate].filter((key) => !(key in refused)));
    const fresh = Object.entries(clashesOnce(plan, catalog, live)).filter(([key]) => !(key in refused));
    if (fresh.length === 0) return refused;
    for (const [key, text] of fresh) refused[key] = text;
  }
}

interface SetState {
  name: string;
  /** Every parameter id the set ends with. */
  ids: string[];
  /** The ones this upload creates, by id. */
  created: Map<string, string>;
}

/** A set's key: its id when it exists, else `new:<name>`. */
const setKeyOf = (catalog: CatalogSnapshot, name: string): string => catalog.sets.find((set) => set.name.trim() === name)?.id ?? `new:${name}`;

function setStates(plan: WorkbookPlan, catalog: CatalogSnapshot, live: ReadonlySet<string>): Map<string, SetState> {
  const owners = plan.parameterList?.work.owners ?? [];
  const states = new Map<string, SetState>();
  const reserved = setReservations(owners, live);
  for (const set of catalog.sets) states.set(set.id, { name: set.name.trim(), ids: set.parameters.map((p) => String(p?.id ?? '')), created: new Map() });
  for (const owner of owners) {
    if (owner.kind !== 'set') continue;
    const built = planOwnerParameters(owner, live, reserved.get(owner));
    states.set(owner.existingId ?? `new:${owner.name}`, {
      name: owner.name,
      ids: built.parameters.map((p) => String(p?.id ?? '')),
      created: new Map(built.created.map((c) => [c.id, c.rowKey] as const))
    });
  }
  return states;
}

function clashesOnce(plan: WorkbookPlan, catalog: CatalogSnapshot, live: ReadonlySet<string>): Record<string, string> {
  const owners = plan.parameterList?.work.owners ?? [];
  const opRows = Object.entries(plan.operations?.work.rows ?? {}).filter(([key]) => live.has(key));
  const sets = setStates(plan, catalog, live);
  const found: Record<string, string> = {};

  const operations: Array<{ name: string; ownerIndex: number; stored: string[]; setKeys: string[] }> = [];
  for (const operation of catalog.operations) {
    const row = opRows.find(([, work]) => work.existingId === operation.id)?.[1];
    operations.push({
      name: operation.name.trim(),
      ownerIndex: owners.findIndex((owner) => owner.kind === 'operation' && owner.existingId === operation.id),
      stored: operation.ownParameters.map((p) => String(p?.id ?? '')),
      setKeys: row?.setNames ? row.setNames.map((name) => setKeyOf(catalog, name)) : operation.parameterSetIds
    });
  }
  owners.forEach((owner, ownerIndex) => {
    if (owner.kind !== 'operation' || owner.existingId !== undefined || owner.operationRowKey === undefined || !live.has(owner.operationRowKey)) return;
    const row = plan.operations?.work.rows[owner.operationRowKey];
    operations.push({ name: owner.name, ownerIndex, stored: [], setKeys: (row?.setNames ?? []).map((name) => setKeyOf(catalog, name)) });
  });

  for (const operation of operations) {
    const setKeys = operation.setKeys.filter((key) => sets.has(key));
    const reserved = setKeys.flatMap((key) => sets.get(key)!.ids);
    const own = operation.ownerIndex >= 0 ? planOwnerParameters(owners[operation.ownerIndex], live, reserved).parameters.map((p) => String(p?.id ?? '')) : operation.stored;
    const ownIds = new Set(own);
    for (const key of setKeys) {
      const state = sets.get(key)!;
      for (const [id, rowKey] of state.created) if (ownIds.has(id) && !(rowKey in found)) found[rowKey] = message(id, operation.name, state.name);
    }
  }

  // Two sets of one operation, as its row would leave it. First clash in set order, as the server reports it.
  for (const [key, row] of opRows) {
    if (row.setNames === undefined) continue;
    const firstSeen = new Map<string, string>();
    for (const state of row.setNames.map((name) => sets.get(setKeyOf(catalog, name)))) {
      if (state === undefined || key in found) continue;
      for (const id of new Set(state.ids)) {
        if (id === '') continue;
        const first = firstSeen.get(id);
        if (first === undefined) firstSeen.set(id, state.name);
        else if (first !== state.name && !(key in found)) found[key] = message(id, first, state.name);
      }
    }
  }
  return found;
}
