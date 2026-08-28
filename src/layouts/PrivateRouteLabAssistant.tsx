import PermissionRoute from "./PermissionRoute";
import { PERMISSIONS } from "../hooks/usePermissions";

/** The AI Lab Assistant. Administrator + Technician, per the matrix amendment. */
const PrivateRouteLabAssistant = () => <PermissionRoute permission={PERMISSIONS.LabAssistantUse} />;

export default PrivateRouteLabAssistant;
