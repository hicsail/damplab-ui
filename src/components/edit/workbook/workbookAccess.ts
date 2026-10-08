import { PERMISSIONS, PermissionName } from '../../../hooks/usePermissions';
import type { EditTypes } from '../ToolBar';

/**
 * Which workbook buttons a caller sees on a Catalog Editor view. Download is a
 * read (catalog-editor:read); Upload is a bulk write (catalog-editor:write) and
 * is refused again server-side by every mutation it calls. Inventory keeps its
 * own, separate workbook.
 */
export function workbookAccess(editType: EditTypes, can: (permission: PermissionName) => boolean): { show: boolean; download: boolean; upload: boolean } {
  if (editType === 'Inventory') return { show: false, download: false, upload: false };
  const download = can(PERMISSIONS.CatalogEditorRead);
  const upload = can(PERMISSIONS.CatalogEditorWrite);
  return { show: download || upload, download, upload };
}

const HISTORY_TYPE: Partial<Record<EditTypes, string>> = {
  Services: 'OPERATION',
  Categories: 'OPERATION',
  'Parameter Sets': 'PARAMETER_SET',
  Bundles: 'BUNDLE',
  SOWs: 'SOW_SECTION'
};

/**
 * Where "Upload history" goes from a Catalog Editor view, or null for a caller
 * who should not see the button: it sits behind the write tier, as it did when
 * only the operations upload wrote logs, and opens already filtered to the
 * kind of log the view's upload writes.
 */
export function workbookHistoryLink(editType: EditTypes, can: (permission: PermissionName) => boolean): string | null {
  const type = HISTORY_TYPE[editType];
  if (!type || !can(PERMISSIONS.CatalogEditorWrite)) return null;
  return `/edit/inventory/upload-history?type=${type}`;
}
