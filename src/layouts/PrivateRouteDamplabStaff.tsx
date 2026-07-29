import { useContext } from "react";
import { Navigate, Outlet } from "react-router";
import {
  UserContext,
  UserContextProps,
  UserProps,
} from "../contexts/UserContext";
import AppBreadcrumbs from "../components/AppBreadcrumbs";

// Admins can access all pages
const PrivateRouteDamplabStaff = () => {
  const userContext: UserContextProps = useContext(UserContext);
  const userProps: UserProps = userContext.userProps;

  return userProps?.isDamplabStaff ? (
    <>
      <AppBreadcrumbs />
      <Outlet />
    </>
  ) : (
    <Navigate to="/login" />
  );
};

export default PrivateRouteDamplabStaff;
