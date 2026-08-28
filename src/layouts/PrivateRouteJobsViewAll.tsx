import PermissionRoute from "./PermissionRoute";
import { PERMISSIONS } from "../hooks/usePermissions";

/** The staff jobs dashboard and per-job technician views. */
const PrivateRouteJobsViewAll = () => <PermissionRoute permission={PERMISSIONS.JobsViewAll} />;

export default PrivateRouteJobsViewAll;
