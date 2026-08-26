import PermissionRoute from "./PermissionRoute";
import { PERMISSIONS } from "../hooks/usePermissions";

/** The lab monitor boards. */
const PrivateRouteLabMonitor = () => <PermissionRoute permission={PERMISSIONS.LabMonitorView} />;

export default PrivateRouteLabMonitor;
