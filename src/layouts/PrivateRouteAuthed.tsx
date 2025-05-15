import { use, useContext } from "react";
import { Navigate, Outlet } from "react-router";
import {
  UserContext,
  UserContextProps,
  UserProps,
} from "../contexts/UserContext";

// Clients can only access certain pages, such as the Canvas, Checkout, and Submission Confirmation
const PrivateRouteAuthed = () => {
  const userContext: UserContextProps = useContext(UserContext);
  const userProps: UserProps = use(userContext.userProps);

  return userProps?.isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRouteAuthed;
