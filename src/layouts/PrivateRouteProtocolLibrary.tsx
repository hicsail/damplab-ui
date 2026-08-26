import PermissionRoute from "./PermissionRoute";
import { PERMISSIONS } from "../hooks/usePermissions";

/** The protocol library. */
const PrivateRouteProtocolLibrary = () => <PermissionRoute permission={PERMISSIONS.ProtocolLibraryRead} />;

export default PrivateRouteProtocolLibrary;
