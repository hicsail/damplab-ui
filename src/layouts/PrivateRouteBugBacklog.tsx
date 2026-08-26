import PermissionRoute from "./PermissionRoute";
import { PERMISSIONS } from "../hooks/usePermissions";

/** The ClickUp-backed bug backlog. */
const PrivateRouteBugBacklog = () => <PermissionRoute permission={PERMISSIONS.BugBacklogView} />;

export default PrivateRouteBugBacklog;
