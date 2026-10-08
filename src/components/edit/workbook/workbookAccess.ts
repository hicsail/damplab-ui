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

/**
 * Where "Upload history" goes from a Catalog Editor view, or null for a caller
 * who should not see the button: it sits behind the write tier, as it did when
 * only the operations upload wrote logs. It opens unfiltered: one upload writes
 * a log per sheet it applied from, whichever view it was started from, so no
 * single type is the view's own.
 */
export function workbookHistoryLink(editType: EditTypes, can: (permission: PermissionName) => boolean): string | null {
  if (editType === 'Inventory' || !can(PERMISSIONS.CatalogEditorWrite)) return null;
  return '/edit/inventory/upload-history';
}
