import PermissionRoute from "./PermissionRoute";
import { PERMISSIONS } from "../hooks/usePermissions";

/** Booking machines and consumables for yourself. */
const PrivateRouteInventoryBook = () => <PermissionRoute permission={PERMISSIONS.InventoryBook} />;

export default PrivateRouteInventoryBook;
