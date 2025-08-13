// src/pages/LoginForm.tsx
import { useContext } from 'react';
import { Box, Button } from '@mui/material';
import { UserContext, UserContextProps } from "../contexts/UserContext";
import Home from './Home';

export default function LoginForm() {
  const userContext: UserContextProps = useContext(UserContext);
  const userProps = userContext.userProps;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      {!userProps?.isAuthenticated ? (
        <Button variant="contained" onClick={() => userContext.keycloak.login()}>
          Log in
        </Button>
      ) : (
        <Home/>
      )}
    </Box>
  );
}
