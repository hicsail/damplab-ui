import { Navigate, Outlet } from "react-router";
import AppBreadcrumbs from "../components/AppBreadcrumbs";
import { PermissionName, usePermissions } from "../hooks/usePermissions";

/**
 * Shared body of every permission-gated route layout.
 *
 * React Router v7's `layout()` takes a file path and children, not props, so a
 * "required permission" prop is not expressible. Instead each tier gets its own
 * four-line file that calls this with its permission — which keeps the requirement
 * visible next to the routes in `routes.ts`.
 *
 * Two states only, deliberately: `UserContext` resolves permissions inside its
 * module-level top-level await, so by the time this renders the answer is known.
 * Adding a loading state here would mean permissions were being fetched too late,
 * and every gated route would bounce to home on a hard refresh.
 *
 * Mounting `AppBreadcrumbs` is part of the contract — every layout in this app does,
 * and a tier that forgot it would silently lose its breadcrumb trail.
 */
export default function PermissionRoute({ permission }: { permission: PermissionName }) {
  const { can } = usePermissions();

  return can(permission) ? (
    <>
      <AppBreadcrumbs />
      <Outlet />
    </>
  ) : (
    <Navigate to="/" />
  );
}
