import PermissionRoute from "./PermissionRoute";
import { PERMISSIONS } from "../hooks/usePermissions";

/** The technician bench. */
const PrivateRouteBench = () => <PermissionRoute permission={PERMISSIONS.BenchUse} />;

export default PrivateRouteBench;
