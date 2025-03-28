import { useEffect, useState } from "react";
import { Box, Button, Avatar, Typography, Menu, MenuItem, CircularProgress, Snackbar, Alert } from "@mui/material";
import { UserInfo } from "../types/mpi";

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
          const backendUrl = process.env.REACT_APP_BACKEND_MPI || 'http://127.0.0.1:5100';
          const response = await fetch(`${backendUrl}/mpi/user-info`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUserInfo(userData);
            setIsLoggedIn(true);
          } else if (response.status === 401) {
            setError('Session expired. Please log in again.');
            localStorage.removeItem('session_token');
            setIsLoggedIn(false);
            setUserInfo(null);
          } else if (response.status === 403) {
            setError('You do not have permission to access this feature.');
            localStorage.removeItem('session_token');
            setIsLoggedIn(false);
            setUserInfo(null);
          } else {
            setError('Authentication failed. Please try again.');
            localStorage.removeItem('session_token');
            setIsLoggedIn(false);
            setUserInfo(null);
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          setError('Connection error. Please try again.');
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
          const backendUrl = process.env.REACT_APP_BACKEND_MPI || 'http://127.0.0.1:5100';
          const response = await fetch(`${backendUrl}/mpi/is_logged_in`, {
            headers: {
              'Authorization': `Bearer ${sessionToken}`
            }
          });
          const data = await response.json();
          if (data.loggedIn) {
            setIsLoggedIn(true);
            // Fetch user info
            const userResponse = await fetch(`${backendUrl}/mpi/user-info`, {
              headers: {
                'Authorization': `Bearer ${sessionToken}`
              }
            });
            const userData = await userResponse.json();
            setUserInfo(userData);
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
    
    const backendUrl = process.env.REACT_APP_BACKEND_MPI || 'http://127.0.0.1:5100';
    const currentPath = window.location.pathname;
    const loginUrl = `${backendUrl}/mpi/login?state=${encodeURIComponent(state)}&redirectTo=${encodeURIComponent(currentPath)}`;
    window.location.href = loginUrl;
  };

  const handleLogout = () => {
    setIsLoading(true);
    localStorage.removeItem('session_token');
    sessionStorage.removeItem('auth_state');
    setIsLoggedIn(false);
    setUserInfo(null);
    handleMenuClose();
    
    const backendUrl = process.env.REACT_APP_BACKEND_MPI || 'http://127.0.0.1:5100';
    const logoutUrl = `${backendUrl}/mpi/logout`;
    window.location.href = logoutUrl;
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
            {userInfo?.picture ? (
              <Avatar 
                src={userInfo.picture} 
                alt={userInfo.name || 'User'} 
                sx={{ width: 32, height: 32, marginRight: 1 }}
              />
            ) : (
              <Avatar sx={{ width: 32, height: 32, marginRight: 1 }}>
                {userInfo?.name?.charAt(0) || 'U'}
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
            MenuListProps={{
              'aria-labelledby': 'user-menu-button',
            }}
          >
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </>
      ) : (
        <Button 
          onClick={handleLogin} 
          variant='contained' 
          color='primary'
          disabled={isLoading}
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
