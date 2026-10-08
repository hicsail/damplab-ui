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
