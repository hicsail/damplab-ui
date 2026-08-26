import PermissionRoute from "./PermissionRoute";
import { PERMISSIONS } from "../hooks/usePermissions";

/** The lab layout / stations map. */
const PrivateRouteLabLayout = () => <PermissionRoute permission={PERMISSIONS.LabLayoutRead} />;

export default PrivateRouteLabLayout;
