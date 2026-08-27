import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { PermissionName, usePermissions } from '../hooks/usePermissions';

interface CanProps {
  /** The permission the caller must hold for `children` to render. */
  permission: PermissionName;
  children: ReactNode;
  /** Rendered instead when the caller lacks the permission. Defaults to nothing. */
  fallback?: ReactNode;
}

/**
 * Render `children` only if the caller holds `permission`.
 *
 * For **entry-point actions** — New, Add, Delete, Upload — where the right
 * behaviour is for the control to be absent. Detail pages a read-tier user may
 * legitimately open should render *read-only* instead (inputs disabled, Save
 * hidden), so `catalog-editor:read` and `lab-layout:read` are real tiers rather
 * than dead ends. Use `can()` directly for that; wrapping a whole page in this
 * would bounce those users, which is what `PermissionRoute` is for.
 *
 * Goes through `usePermissions`, never raw `UserContext` — that is what keeps the
 * staff Client View toggle working.
 *
 * **This is not a security boundary.** Every gate here has a server-side twin; the
 * standard is that forbidden access is denied server-side, and hiding a control is
 * not the test. What this buys is that a user is not walked through a form they
 * will be refused at the end of.
 */
export function Can({ permission, children, fallback = null }: CanProps) {
  const { can } = usePermissions();
  return <>{can(permission) ? children : fallback}</>;
}

export default Can;

/**
 * Bounce a caller who lacks `permission` back to `to`.
 *
 * For **creation** pages — `/edit/services/new`, `/edit/bundles/new`,
 * `/edit/inventory/new`. Those have nothing to show read-only: the whole page is
 * an empty form whose only purpose is a mutation the caller cannot perform. The
 * read-only treatment is for *detail* pages, where there is real content behind
 * the form.
 *
 * The Add buttons that lead here are already hidden by `Can`; this is what a typed
 * URL hits.
 */
export function RequirePermissionOrRedirect({ permission, to = '/edit', children }: { permission: PermissionName; to?: string; children: ReactNode }) {
  const { can } = usePermissions();
  if (!can(permission)) return <Navigate to={to} replace />;
  return <>{children}</>;
}
