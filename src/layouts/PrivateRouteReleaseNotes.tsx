import PermissionRoute from "./PermissionRoute";
import { PERMISSIONS } from "../hooks/usePermissions";

/** Release Notes: a staff page since 2026-09-18, not a baseline one. */
const PrivateRouteReleaseNotes = () => <PermissionRoute permission={PERMISSIONS.ReleaseNotesView} />;

export default PrivateRouteReleaseNotes;
