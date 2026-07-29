import { useContext } from "react";
import { Navigate, Outlet } from "react-router";
import {
  UserContext,
  UserContextProps,
  UserProps,
} from "../contexts/UserContext";
import AppBreadcrumbs from "../components/AppBreadcrumbs";

// Clients can only access certain pages, such as the Canvas, Checkout, and Submission Confirmation
const PrivateRouteAuthed = () => {
  const userContext: UserContextProps = useContext(UserContext);
  const userProps: UserProps = userContext.userProps;

  return userProps?.isAuthenticated ? (
    <>
      <AppBreadcrumbs />
      <Outlet />
    </>
  ) : (
    <Navigate to="/login" />
  );
};

export default PrivateRouteAuthed;
