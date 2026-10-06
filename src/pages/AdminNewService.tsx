import { RequirePermissionOrRedirect } from '../components/PermissionGate';
import { PERMISSIONS } from '../hooks/usePermissions';
import AdminEditService from './AdminEditService';

/**
 * Creating an operation uses the same form as editing one — see
 * AdminEditService, which treats a route with no `:serviceId` as a create.
 *
 * A creation page has nothing to render read-only — it is an empty form whose only
 * purpose is a mutation. So this bounces rather than disabling. The Add button that
 * leads here is already hidden; this is what a typed URL hits.
 */
export default function AdminNewService() {
  return (
    <RequirePermissionOrRedirect permission={PERMISSIONS.CatalogEditorWrite}>
      <AdminEditService />
    </RequirePermissionOrRedirect>
  );
}
