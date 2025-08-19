import { useContext } from 'react';
import { Navigate } from 'react-router';
import { Box, Button } from '@mui/material';
import { UserContext, UserContextProps } from "../contexts/UserContext";

export default function LoginForm() {
  // Technically we should clear the Apollo client cache on logout, but right now, even without the resetStore() 
  // call, all queries get refetched anyway because the keycloak logout redirects essentially trigger a reload.
  // So this is redundant by happenstance. Do it anyway to be proper...
  const userContext: UserContextProps = useContext(UserContext);
  const userProps = userContext.userProps;

  if (userProps?.isAuthenticated) {
    // Redirect to protected home page
    return <Navigate to="/" replace />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <Button variant="contained" onClick={() => userContext.keycloak.login()}>
        Log in
      </Button>
    </Box>
  );
}