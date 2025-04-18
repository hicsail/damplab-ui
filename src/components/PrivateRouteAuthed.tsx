import React, { use, useContext } from "react";
import { Navigate } from "react-router-dom";
import {
  UserContext,
  UserContextProps,
  UserProps,
} from "../contexts/UserContext";

// Clients can only access certain pages, such as the Canvas, Checkout, and Submission Confirmation
const PrivateRouteAuthed = ({ children }: any) => {
  const userContext: UserContextProps = useContext(UserContext);
  const userProps: UserProps = use(userContext.userProps);

  return userProps?.isAuthenticated ? children : <Navigate to="/login" />;
};

export default PrivateRouteAuthed;
