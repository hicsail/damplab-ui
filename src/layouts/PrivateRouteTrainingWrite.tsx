import PermissionRoute from "./PermissionRoute";
import { PERMISSIONS } from "../hooks/usePermissions";

/**
 * The Learning Hub editor. Same set of people as the administrator tier today,
 * but gated on the permission the matrix actually names for it rather than on
 * `customers:manage`.
 */
const PrivateRouteTrainingWrite = () => <PermissionRoute permission={PERMISSIONS.TrainingWrite} />;

export default PrivateRouteTrainingWrite;
