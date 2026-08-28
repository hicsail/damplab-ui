import PermissionRoute from "./PermissionRoute";
import { PERMISSIONS } from "../hooks/usePermissions";

/** The catalog & inventory editor and its sub-pages. */
const PrivateRouteCatalogEditor = () => <PermissionRoute permission={PERMISSIONS.CatalogEditorRead} />;

export default PrivateRouteCatalogEditor;
