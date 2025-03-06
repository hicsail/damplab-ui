import { useEffect, useState } from "react";
import { Box, Button, Avatar, Typography, Menu, MenuItem } from "@mui/material";
import { handleLoginCallback, checkLoginStatus, logout, debugCheckToken } from "../mpi/SequencesQueries";

interface MPILoginFormProps {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
}

interface UserInfo {
  name?: string;
  email?: string;
  picture?: string;
}

export default function MPILoginForm({ isLoggedIn, setIsLoggedIn }: MPILoginFormProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Check login status and get user info
  useEffect(() => {
    const checkLogin = async () => {
      const token = localStorage.getItem('session_token');
      
      // Debug the token directly
      console.log("MPILoginForm - Checking token");
      debugCheckToken();
      
      // Log the token presence to debug
      console.log("Token exists:", !!token);
      
      // Check login status first
      const loggedIn = await checkLoginStatus();
      setIsLoggedIn(loggedIn);
      
      if (loggedIn && token) {
        // Get user info from localStorage or from API
        const storedUserInfo = localStorage.getItem('user_info');
        if (storedUserInfo) {
          try {
            setUserInfo(JSON.parse(storedUserInfo));
          } catch (error) {
            console.error('Failed to parse stored user info', error);
            localStorage.removeItem('user_info');
          }
        }
        
        // Always fetch fresh user info when logged in
        try {
          const response = await fetch(`${process.env.REACT_APP_BACKEND_MPI}/user-info`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          
          if (response.status === 401) {
            console.error("Unauthorized when fetching user info");
            // Clear token and redirect to login
            localStorage.removeItem('session_token');
            localStorage.removeItem('token_expires_at');
            localStorage.removeItem('user_info');
            setIsLoggedIn(false);
            return;
          }
          
          if (response.ok) {
            const data = await response.json();
            setUserInfo(data);
            localStorage.setItem('user_info', JSON.stringify(data));
          } else {
            console.error('Failed to fetch user info', await response.text());
          }
        } catch (error) {
          console.error('Error fetching user info', error);
        }
      } else if (!loggedIn) {
        // Clear user data if not logged in
        setUserInfo(null);
        localStorage.removeItem('user_info');
      }
    };
    
    checkLogin();
  }, [setIsLoggedIn]);

  const handleLogin = () => {
    // Generate a random state parameter for security
    const state = Math.random().toString(36).substring(2);
    localStorage.setItem('auth_state', state);
    
    // Clear any existing tokens to prevent issues
    localStorage.removeItem('session_token');
    localStorage.removeItem('token_expires_at');
    
    // Encode redirect URI properly
    const redirectUri = encodeURIComponent(`${process.env.REACT_APP_REDIRECT_URI}/mpi/auth0_redirect`);
    
    console.log("Starting login process");
    console.log("Redirect URI:", `${process.env.REACT_APP_REDIRECT_URI}/mpi/auth0_redirect`);
    
    // Build Auth0 authorization URL with proper encoding
    const authUrl = `https://${process.env.REACT_APP_AUTH0_DOMAIN}/authorize` +
      `?response_type=code` +
      `&scope=${encodeURIComponent('openid profile email offline_access')}` +
      `&client_id=${encodeURIComponent(process.env.REACT_APP_AUTH0_CLIENT_ID || '')}` +
      `&redirect_uri=${redirectUri}` +
      `&audience=${encodeURIComponent(process.env.REACT_APP_AUTH0_AUDIENCE || '')}` +
      `&state=${encodeURIComponent(state)}`;
    
    console.log("Redirecting to Auth0:", authUrl.substring(0, 100) + "...");
    window.location.href = authUrl;
  };

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('user_info');
    setIsLoggedIn(false);
    setUserInfo(null);
    
    // Redirect to Auth0 logout page
    window.location.href = `https://${process.env.REACT_APP_AUTH0_DOMAIN}/v2/logout?client_id=${process.env.REACT_APP_AUTH0_CLIENT_ID}&returnTo=${encodeURIComponent(process.env.REACT_APP_REDIRECT_URI || '')}`;
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  if (isLoggedIn === null) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', height: '32px' }}>Loading...</Box>;
  }

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
}
