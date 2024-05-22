import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRouteClient = ({ children }: any) => {
  const loginInfo = JSON.parse(sessionStorage.getItem('login_info') || '{}');
  const isAuthenticated = loginInfo && loginInfo.loggedIn;
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default PrivateRouteClient;
