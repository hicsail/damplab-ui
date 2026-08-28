import { useMemo } from 'react';
import { useEffectiveUser } from './useEffectiveUser';

/**
 * The vocabulary, mirrored from `damplab-backend/src/auth/permissions/permission.enum.ts`.
 *
 * Only the *strings* are duplicated, never the role -> permission mapping: the UI
 * asks `myPermissions` for its resolved list. A typo here is a compile error at the
 * call site, which is the whole point of listing them.
 */
export const PERMISSIONS = {
  JobsView: 'jobs:view',
  JobsViewAll: 'jobs:view-all',
  JobSubmitForClient: 'job:submit-for-client',
  ReleaseNotesView: 'releasenotes:view',
  AnnouncementsRead: 'announcements:read',
  AnnouncementsWrite: 'announcements:write',
  TrainingRead: 'training:read',
  TrainingWrite: 'training:write',
  BugsReport: 'bugs:report',
  BugBacklogView: 'bugbacklog:view',
  CatalogView: 'catalog:view',
  CatalogEditorRead: 'catalog-editor:read',
  CatalogEditorWrite: 'catalog-editor:write',
  ProtocolLibraryRead: 'protocol-library:read',
  ProtocolLibraryWrite: 'protocol-library:write',
  LabLayoutRead: 'lab-layout:read',
  LabLayoutWrite: 'lab-layout:write',
  InventoryRead: 'inventory:read',
  InventoryWrite: 'inventory:write',
  InventoryBook: 'inventory:book',
  InventorySchedule: 'inventory:schedule',
  LabMonitorView: 'labmonitor:view',
  LabMonitorArchive: 'labmonitor:archive',
  LabStatusTvView: 'labstatustv:view',
  BenchUse: 'bench:use',
  BillingView: 'billing:view',
  CustomersManage: 'customers:manage',
  ApiKeysManage: 'apikeys:manage',
  DataTranslationUse: 'datatranslation:use',
  LabAssistantUse: 'labassistant:use',
  InternalFieldsRead: 'internal-fields:read',
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionHolder {
  permissions?: string[];
  permissionsLoaded?: boolean;
  isDamplabStaff?: boolean;
}

/**
 * Answer "may this actor do this thing" for a user object.
 *
 * Exported separately from the hook so non-component code and tests can use it.
 *
 * The `permissionsLoaded === false` branch is a degraded mode, not a second copy of
 * the table: if the `myPermissions` fetch failed we fall back to the pre-permissions
 * rule, staff-or-not. What that costs is worth stating plainly — during a fetch
 * failure a plain client sees an empty menu. The fix for that would be a retry, not
 * a mirrored permission table in the UI.
 */
export function canFor(user: PermissionHolder | undefined | null, permission: PermissionName): boolean {
  if (user?.permissionsLoaded === false) return Boolean(user?.isDamplabStaff);
  return (user?.permissions ?? []).includes(permission);
}

/**
 * Derives from `useEffectiveUser` and nothing else. Reading `UserContext` directly
 * would silently break the Client View toggle.
 */
export function usePermissions(): { can: (permission: PermissionName) => boolean; permissions: string[] } {
  const { userProps } = useEffectiveUser();
  const permissions = userProps?.permissions ?? [];
  return useMemo(
    () => ({
      can: (permission: PermissionName) => canFor(userProps, permission),
      permissions,
    }),
    [userProps, permissions],
  );
}
