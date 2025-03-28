import { useEffect, useState } from "react";
import { Box, Button, Avatar, Typography, Menu, MenuItem } from "@mui/material";
import { UserInfo } from "../types/mpi";

interface MPILoginFormProps {
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  userInfo: UserInfo | null;
  setUserInfo: (userInfo: UserInfo | null) => void;
}

const MPILoginForm: React.FC<MPILoginFormProps> = ({ isLoggedIn, setIsLoggedIn, userInfo, setUserInfo }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('session_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const checkLoginStatus = async () => {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_MPI || 'http://127.0.0.1:5100';
        const sessionToken = localStorage.getItem('session_token');
        
        const response = await fetch(`${backendUrl}/mpi/is_logged_in`, {
          headers: sessionToken ? {
            'Authorization': `Bearer ${sessionToken}`
          } : {}
        });

        const data = await response.json();
        setIsLoggedIn(data.loggedIn);

        if (data.loggedIn) {
          const userResponse = await fetch(`${backendUrl}/mpi/user-info`, {
            headers: {
              'Authorization': `Bearer ${sessionToken}`
            }
          });
          const userData = await userResponse.json();
          setUserInfo(userData);
        }
      } catch (error) {
        setIsLoggedIn(false);
      }
    };

    checkLoginStatus();
  }, [setIsLoggedIn, setUserInfo]);

  const handleLogin = () => {
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('auth_state', state);
    
    const backendUrl = process.env.REACT_APP_BACKEND_MPI || 'http://127.0.0.1:5100';
    const loginUrl = `${backendUrl}/mpi/login?state=${encodeURIComponent(state)}`;
    window.location.href = loginUrl;
  };

  const handleLogout = () => {
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

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '32px' }}>
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
        <Button onClick={handleLogin} variant='contained' color='primary'>MPI Login</Button>
      )}
    </Box>
  );
};

export default MPILoginForm;
