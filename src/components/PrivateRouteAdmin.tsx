import React from 'react';
import { Navigate } from 'react-router-dom';


// Admins can access all pages
const PrivateRouteAdmin = ({ children }: any) => {

  const loginInfo = JSON.parse(localStorage.getItem('login_info') || '{}');
  const isAuthenticated = loginInfo && loginInfo.loggedIn && loginInfo.role === 'admin';

  return isAuthenticated ? children : <Navigate to="/login" />;

};

export default PrivateRouteAdmin;
