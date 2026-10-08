import { describe, expect, it } from 'vitest';
import { PERMISSIONS, PermissionName } from '../../../hooks/usePermissions';
import { EditTypes } from '../ToolBar';
import { workbookAccess, workbookHistoryLink } from './workbookAccess';

const holder = (...held: PermissionName[]) => (permission: PermissionName): boolean => held.includes(permission);
const technician = holder(PERMISSIONS.CatalogEditorRead);
const administrator = holder(PERMISSIONS.CatalogEditorRead, PERMISSIONS.CatalogEditorWrite);

describe('workbook buttons (rule 1)', () => {
  it.each<EditTypes>(['Services', 'Parameter Sets', 'Categories', 'Bundles', 'SOWs'])('shows on the %s view', (view) => {
    expect(workbookAccess(view, administrator).show).toBe(true);
  });

  it('does not show on the Inventory view, which keeps its own workbook', () => {
    expect(workbookAccess('Inventory', administrator)).toEqual({ show: false, download: false, upload: false });
  });

  it('gives a technician Download and not Upload', () => {
    expect(workbookAccess('Services', technician)).toEqual({ show: true, download: true, upload: false });
  });

  it('gives an administrator both', () => {
    expect(workbookAccess('Services', administrator)).toEqual({ show: true, download: true, upload: true });
  });

  it('gives a caller with neither permission nothing', () => {
    expect(workbookAccess('Services', holder())).toEqual({ show: false, download: false, upload: false });
  });
});

describe('upload history link (M3)', () => {
  it('is for the write tier only, as it was when it sat inside the write gate', () => {
    expect(workbookHistoryLink('Services', technician)).toBeNull();
    expect(workbookHistoryLink('Services', holder())).toBeNull();
    expect(workbookHistoryLink('Services', administrator)).not.toBeNull();
  });

  it('opens the history already filtered to what the view’s upload writes', () => {
    expect(workbookHistoryLink('Services', administrator)).toBe('/edit/inventory/upload-history?type=OPERATION');
    expect(workbookHistoryLink('Categories', administrator)).toBe('/edit/inventory/upload-history?type=OPERATION');
    expect(workbookHistoryLink('Parameter Sets', administrator)).toBe('/edit/inventory/upload-history?type=PARAMETER_SET');
    expect(workbookHistoryLink('Bundles', administrator)).toBe('/edit/inventory/upload-history?type=BUNDLE');
    expect(workbookHistoryLink('SOWs', administrator)).toBe('/edit/inventory/upload-history?type=SOW_SECTION');
  });

  it('is absent on the Inventory view, which has its own', () => {
    expect(workbookHistoryLink('Inventory', administrator)).toBeNull();
  });
});
