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
    window.location.href = `https://mpi-dev.us.auth0.com/authorize?response_type=code&scope=offline_access&client_id=tZSXM9f8WUiPIpNGt1kXlGqzZVYvWNEF&redirect_uri=http://127.0.0.1:5100/mpi/auth0_redirect&audience=https://mpi.com`
  };

  const handleLogout = () => {  // TODO: Answering 'No' on confirmation page does not work?
    window.location.href = `https://mpi-dev.us.auth0.com/oidc/logout?post_logout_redirect_uri=http://127.0.0.1:5100/mpi/auth0_logout&client_id=tZSXM9f8WUiPIpNGt1kXlGqzZVYvWNEF`
  };

  if (isLoggedIn === null) {
    return <p>Loading...</p>;
  }
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', height: '50px'}}>
      {isLoggedIn ? (
        <Button onClick={handleLogout} variant='contained' color='inherit'>MPI Logout</Button>
      ) : (
        <Button onClick={handleLogin} variant='contained' color='primary'>MPI Login</Button>
      )}
    </Box>
  )

}
