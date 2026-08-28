import { describe, expect, it } from 'vitest';
import { GridRowModes, GridRowModesModel } from '@mui/x-data-grid';
import { getActionsColumn } from './ActionColumn';
import { canFor } from '../../hooks/usePermissions';

const actionsFor = (canWrite: boolean, rowModesModel: GridRowModesModel = {}) => {
  const column = getActionsColumn({
    canWrite,
    rowModesModel,
    handleSave: () => {},
    handleCancel: () => {},
    handleEdit: () => {},
    handleDelete: () => {}
  });
  return column.getActions!({ id: 'row-1' } as any);
};

describe('getActionsColumn — the shared Actions column', () => {
  it('renders Edit and Delete for a writer', () => {
    expect(actionsFor(true)).toHaveLength(2);
  });

  it('renders Save and Cancel for a writer mid-edit', () => {
    expect(actionsFor(true, { 'row-1': { mode: GridRowModes.Edit } })).toHaveLength(2);
  });

  it('renders nothing at all for a read-tier caller', () => {
    // Not "disabled" — absent. A greyed Delete reads as "something is broken";
    // no Delete reads as "this is a view".
    expect(actionsFor(false)).toEqual([]);
  });

  it('renders nothing even if a row somehow got into edit mode', () => {
    // Belt and braces: MUI can be driven into edit mode by a keypress, and the
    // column must not hand back a Save that the server will refuse.
    expect(actionsFor(false, { 'row-1': { mode: GridRowModes.Edit } })).toEqual([]);
  });
});

describe('canFor — the degraded mode behind every gate', () => {
  it('grants a listed permission', () => {
    expect(canFor({ permissions: ['catalog-editor:write'], permissionsLoaded: true }, 'catalog-editor:write')).toBe(true);
  });

  it('denies an unlisted one', () => {
    expect(canFor({ permissions: ['catalog-editor:read'], permissionsLoaded: true }, 'catalog-editor:write')).toBe(false);
  });

  it('falls back to the legacy staff boolean when the permissions fetch failed', () => {
    // Worth pinning because it inverts every gate in the app: during a fetch
    // failure a technician is treated as a non-writer everywhere, which is the
    // safe direction for write controls but means read-only pages appear
    // read-only for a reason the user cannot see.
    expect(canFor({ permissionsLoaded: false, isDamplabStaff: true }, 'catalog-editor:write')).toBe(true);
    expect(canFor({ permissionsLoaded: false, isDamplabStaff: false }, 'catalog-editor:write')).toBe(false);
  });

  it('denies everything for an absent user rather than throwing', () => {
    expect(canFor(undefined, 'inventory:write')).toBe(false);
    expect(canFor(null, 'inventory:write')).toBe(false);
  });
});
