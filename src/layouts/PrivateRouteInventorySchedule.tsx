import PermissionRoute from "./PermissionRoute";
import { PERMISSIONS } from "../hooks/usePermissions";

/** The lab-wide inventory schedule. */
const PrivateRouteInventorySchedule = () => <PermissionRoute permission={PERMISSIONS.InventorySchedule} />;

export default PrivateRouteInventorySchedule;
