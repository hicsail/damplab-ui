import React from 'react';
import { Navigate } from 'react-router-dom';


// Clients can only access certain pages, such as the Canvas, Checkout, and Submission Confirmation
const PrivateRouteClient = ({ children }: any) => {

  const loginInfo = JSON.parse(localStorage.getItem('login_info') || '{}');
  const isAuthenticated = loginInfo && loginInfo.loggedIn;

  return isAuthenticated ? children : <Navigate to="/login" />;

};

export default PrivateRouteClient;
