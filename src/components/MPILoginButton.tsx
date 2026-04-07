import { useEffect, useState } from "react";
import { Box, Button, Avatar, Typography, Menu, MenuItem, CircularProgress, Snackbar, Alert } from "@mui/material";
import { UserInfo } from "../types/mpi";
import { checkLoginStatus, logout } from "../mpi/MPIAuthQueries";

interface MPILoginButtonProps {
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  userInfo: UserInfo | null;
  setUserInfo: (userInfo: UserInfo | null) => void;
}

const MPILoginButton: React.FC<MPILoginButtonProps> = ({ isLoggedIn, setIsLoggedIn, userInfo, setUserInfo }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setIsLoading(true);
      localStorage.setItem('session_token', token);
      // Remove the token from URL without triggering a page reload
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Verify the token and get user info
      const verifyToken = async () => {
        try {
          console.log("MPI Login: Verifying token from URL");
          
          // Decode and log the token for debugging
          const token = localStorage.getItem('session_token');
          if (token) {
            try {
              const parts = token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                console.log("MPI Login: Token contains userId:", payload.userId);
              }
            } catch (e) {
              console.error("MPI Login: Could not decode token:", e);
            }
          }
          
          const { loggedIn, userInfo: userData } = await checkLoginStatus();
          
          if (loggedIn && userData) {
            console.log("MPI Login: Token verified successfully");
            setUserInfo(userData);
            setIsLoggedIn(true);
          } else {
            console.error("MPI Login: Token verification failed - loggedIn:", loggedIn, "userData:", userData);
            console.error("MPI Login: This usually means the user data wasn't found in MongoDB. Check backend logs.");
            setError('Authentication failed. The token is valid but user data was not found. Please try logging in again.');
            localStorage.removeItem('session_token');
            setIsLoggedIn(false);
            setUserInfo(null);
          }
        } catch (error) {
          console.error('MPI Login: Token verification error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Connection error. Please try again.';
          setError(errorMessage);
          localStorage.removeItem('session_token');
          setIsLoggedIn(false);
          setUserInfo(null);
        } finally {
          setIsLoading(false);
        }
      };

      verifyToken();
    }

    const checkExistingSession = async () => {
      const sessionToken = localStorage.getItem('session_token');
      if (sessionToken) {
        setIsLoading(true);
        try {
          const { loggedIn, userInfo: userData } = await checkLoginStatus();
          
          if (loggedIn && userData) {
            setUserInfo(userData);
            setIsLoggedIn(true);
          } else {
            localStorage.removeItem('session_token');
            setIsLoggedIn(false);
            setUserInfo(null);
          }
        } catch (error) {
          console.error('Session check failed:', error);
          setError('Session check failed. Please log in again.');
          localStorage.removeItem('session_token');
          setIsLoggedIn(false);
          setUserInfo(null);
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkExistingSession();
  }, [setIsLoggedIn, setUserInfo]);

  const handleLogin = () => {
    setIsLoading(true);
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('auth_state', state);
    
    const backendUrl = import.meta.env.VITE_BACKEND_BASEURL || import.meta.env.REACT_APP_BACKEND_BASEURL || 'http://127.0.0.1:5100';
    console.log("MPI Login: Using backend URL:", backendUrl);
    const currentPath = window.location.pathname;
    const loginUrl = `${backendUrl}/mpi/login?state=${encodeURIComponent(state)}&redirectTo=${encodeURIComponent(currentPath)}`;
    console.log("MPI Login: Redirecting to:", loginUrl);
    window.location.href = loginUrl;
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('session_token');
      sessionStorage.removeItem('auth_state');
      setIsLoggedIn(false);
      setUserInfo(null);
      handleMenuClose();
      
      // Redirect to Auth0 logout
      const auth0Domain = import.meta.env.REACT_APP_AUTH0_DOMAIN;
      const clientId = import.meta.env.REACT_APP_AUTH0_CLIENT_ID;
      const frontendUrl = import.meta.env.REACT_APP_FRONTEND_URL || 'http://localhost:5173';
      const logoutUrl = `https://${auth0Domain}/v2/logout?client_id=${clientId}&returnTo=${frontendUrl}&federated`;
      window.location.href = logoutUrl;
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleErrorClose = () => {
    setError(null);
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '36px' }}>
      {isLoggedIn ? (
        <>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              '&:hover': { opacity: 0.8 }
            }}
            onClick={handleMenuClick}
          >
            {userInfo && userInfo.picture ? (
              <Avatar 
                src={userInfo.picture} 
                alt={userInfo.name || 'User'} 
                sx={{ width: 32, height: 32, marginRight: 1 }}
              />
            ) : (
              <Avatar sx={{ width: 32, height: 32, marginRight: 1 }}>
                {userInfo && userInfo.name ? userInfo.name.charAt(0) : 'U'}
              </Avatar>
            )}
            <Typography variant="body2" sx={{ marginRight: 1 }}>
              {userInfo?.name || 'User'}
            </Typography>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleLogout}>
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </>
      ) : (
        <Button 
          variant="contained" 
          onClick={handleLogin}
          disabled={isLoading}
          sx={{ textTransform: 'none' }}
        >
          {isLoading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'MPI Login'
          )}
        </Button>
      )}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleErrorClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleErrorClose} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MPILoginButton;
