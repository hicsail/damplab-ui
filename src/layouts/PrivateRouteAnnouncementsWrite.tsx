import PermissionRoute from "./PermissionRoute";
import { PERMISSIONS } from "../hooks/usePermissions";

/**
 * The announcements editor. Same set of people as the administrator tier today,
 * since Administrator holds everything — but the enforced permission should be the
 * one the matrix actually names for the page, not `customers:manage`.
 */
const PrivateRouteAnnouncementsWrite = () => <PermissionRoute permission={PERMISSIONS.AnnouncementsWrite} />;

export default PrivateRouteAnnouncementsWrite;
