import { useEffect } from "react";

import { Box, Button } from "@mui/material";

interface MPILoginFormProps {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void | null;
}


export default function MPILoginForm({isLoggedIn, setIsLoggedIn}: MPILoginFormProps) {

  const checkLoginStatus = async () => {
    try {
      const response = await fetch('http://localhost:5100/mpi/is_logged_in');
      const data = await response.json();
      const status: boolean = data.loggedIn;
      console.log('login status: ', status);
      setIsLoggedIn(status);
    } catch (error) {
      console.error('Failed to check login status', error);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const handleLogin = () => {
    window.location.href = `https://${process.env.REACT_APP_AUTH0_DOMAIN}/authorize?response_type=code&scope=offline_access&client_id=${process.env.REACT_APP_AUTH0_CLIENT_ID}&redirect_uri=${process.env.REACT_APP_REDIRECT_URI}/mpi/auth0_redirect&audience=${process.env.REACT_APP_AUTH0_AUDIENCE}`
  };

  const handleLogout = () => {  // TODO: Answering 'No' on confirmation page does not work?
    window.location.href = `https://${process.env.REACT_APP_AUTH0_DOMAIN}/oidc/logout?post_logout_redirect_uri=${process.env.REACT_APP_REDIRECT_URI}/mpi/auth0_logout&client_id=${process.env.REACT_APP_AUTH0_CLIENT_ID}`
  };

  if (isLoggedIn === null) {
    return <p>Loading...</p>;
  }
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', height: '32px'}}>
      {isLoggedIn ? (
        <Button onClick={handleLogout} variant='contained' color='inherit'>MPI Logout</Button>
      ) : (
        <Button onClick={handleLogin} variant='contained' color='primary'>MPI Login</Button>
      )}
    </Box>
  )

}
