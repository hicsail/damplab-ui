import React, { use, useContext } from "react";
import { Navigate } from "react-router-dom";
import {
  UserContext,
  UserContextProps,
  UserProps,
} from "../contexts/UserContext";

// Admins can access all pages
const PrivateRouteDamplabStaff = ({ children }: any) => {
  const userContext: UserContextProps = useContext(UserContext);
  const userProps: UserProps = use(userContext.userProps);

  return userProps?.isDamplabStaff ? children : <Navigate to="/login" />;
};

export default PrivateRouteDamplabStaff;
