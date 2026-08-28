import PermissionRoute from "./PermissionRoute";
import { PERMISSIONS } from "../hooks/usePermissions";

/** Inventory availability (read-only view of the lab stock). */
const PrivateRouteInventoryRead = () => <PermissionRoute permission={PERMISSIONS.InventoryRead} />;

export default PrivateRouteInventoryRead;
