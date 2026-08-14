import { Navigate, Outlet } from "react-router";
import { useEffectiveUser } from "../hooks/useEffectiveUser";
import AppBreadcrumbs from "../components/AppBreadcrumbs";

// Admins can access all pages; redirects when in client view mode
const PrivateRouteDamplabStaff = () => {
  const { userProps } = useEffectiveUser();

  return userProps?.isDamplabStaff ? (
    <>
      <AppBreadcrumbs />
      <Outlet />
    </>
  ) : (
    <Navigate to="/" />
  );
};

export default PrivateRouteDamplabStaff;
