import PermissionRoute from "./PermissionRoute";
import { PERMISSIONS } from "../hooks/usePermissions";

/**
 * The administrator tier. Holds everything the matrix does not place lower, plus
 * the pages absent from the matrix entirely, which Q8 makes administrator-only.
 *
 * Gates on `customers:manage` rather than on `isDamplabStaff`. Only Administrator
 * holds it, so this is the same set of people as before — but it goes through the
 * one permission table, so the staff boolean stops being a second definition of
 * "may do admin things". The name is kept because `routes.ts` and the deploy docs
 * refer to it.
 */
const PrivateRouteDamplabStaff = () => <PermissionRoute permission={PERMISSIONS.CustomersManage} />;

export default PrivateRouteDamplabStaff;
