import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField } from '@mui/material';

import AccountTreeIcon        from '@mui/icons-material/AccountTree';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ViewStreamIcon         from '@mui/icons-material/ViewStream';


export default function LoginForm() {
  const demo_admin = {
    username: process.env.REACT_APP_ADMIN_USERNAME || '',
    password: process.env.REACT_APP_ADMIN_PASSWORD || '',
    role: 'admin'
  };
  const demo_client = {
    username: process.env.REACT_APP_CLIENT_USERNAME || '',
    password: process.env.REACT_APP_CLIENT_PASSWORD || '',
    role: 'client'
  };

  const navigate = useNavigate();

  const [message,  setMessage]  = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [role,     setRole]     = useState('');

  useEffect(() => {
    const loginInfo = JSON.parse(localStorage.getItem('login_info') || '{}');
    if (loginInfo && loginInfo.loggedIn) {
      setLoggedIn(true);
      setRole(loginInfo.role);
    }
  }, []);

  const clickedLogin = () => {
    let loginInfo = {
      username: username,
      password: password,
      time: new Date(),
      loggedIn: false,
      role: ''
    };

    if (username === demo_admin.username && password === demo_admin.password) {
      loginInfo.loggedIn = true;
      loginInfo.role = 'admin';
    } else if (username === demo_client.username && password === demo_client.password) {
      loginInfo.loggedIn = true;
      loginInfo.role = 'client';
    }

    localStorage.setItem('login_info', JSON.stringify(loginInfo));
    setLoggedIn(loginInfo.loggedIn);
    setRole(loginInfo.role);
    setMessage(loginInfo.loggedIn ? 'Login Succeeded' : 'Login Failed');

    // if (loginInfo.loggedIn) {
    //   navigate(loginInfo.role === 'admin' ? '/dashboard' : '/canvas');
    // }
  };

  const clickedLogout = () => {
    localStorage.removeItem('login_info');
    setLoggedIn(false);
    setMessage('Logged out');
    navigate('/login');
  };

  const enterKeyCheck = (e: any) => {
    if (e.key === 'Enter') {
      clickedLogin();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      {!loggedIn ? (
        <>
          <div>
            <TextField id="outlined-basic" label="Username" variant="outlined" sx={{ m: 1 }}
              onKeyDown={(e) => enterKeyCheck(e)} onChange={(entry) => setUsername(entry.target.value)} />
          </div>
          <div>
            <TextField id="outlined-basic" label="Password" type="password" variant="outlined" sx={{ m: 1 }}
              onKeyDown={(e) => enterKeyCheck(e)} onChange={(entry) => setPassword(entry.target.value)} />
          </div>
          <div style={{ margin: 20 }}>
            <Button variant="contained" color="success" onClick={clickedLogin} type="submit">Login</Button>
          </div>
        </>
      ) : (
        <>
          <Box sx={{ width: '300px' }}>
            <p>You are logged in as {role}.</p>
            {/* <Button variant="contained" onClick={() => navigate(role === 'admin' ? '/dashboard' : '/canvas')} style={{ marginRight: 10 }}>
              Go to {role === 'admin' ? 'Dashboard' : 'Canvas'}
            </Button> */}
            <Button variant="contained" onClick={() => window.location.href = "https://www.damplab.org/services"} sx={{ m: 2, width: '210px', textTransform: 'none' }}>
              <img src='/damp-white.svg' height='30px' style={{margin: 1, marginLeft: -25, marginRight: 10}} alt="DAMP Logo"/>DAMPLab Site<br/>(See Service Prices)
            </Button>
            <Button variant="contained" onClick={() => navigate('/canvas')}  sx={{ m: 2, width: '210px', textTransform: 'none' }}>
              <AccountTreeIcon sx={{m:1, ml:-4, transform: "rotate(90deg) scaleY(-1)"}}/>CANVAS<br/>(Design Workflows)
            </Button>
            {role === 'admin' ? 
              <>
                <Button variant="contained" onClick={() => navigate('/dashboard')}  sx={{ m: 2, width: '210px', textTransform: 'none' }}>
                  <ViewStreamIcon sx={{m:1, ml:-3}}/>DASHBOARD<br/>(See Submitted Jobs)
                </Button> 
                <Button variant="contained" onClick={() => navigate('/release_notes')}  sx={{ m: 2, width: '210px', textTransform: 'none' }}>
                  <FormatListBulletedIcon sx={{m:1, ml:-3}}/>Release Notes<br/>(+ Other Admin Info)
                </Button> 
                {/* <Button variant="contained" onClick={() => navigate('/dominos')} sx={{ m: 2 }}>Go to Dominos Page</Button> 
                <Button variant="contained" onClick={() => navigate('/elabs')} sx={{ m: 2 }}>Go to eLabs Site</Button> 
                <Button variant="contained" onClick={() => navigate('/kernel')} sx={{ m: 2 }}>Go to Kernel Site</Button>  */}
              </>
              : ''
            }
            <Button variant="contained" color="error" onClick={clickedLogout}  sx={{ m: 5 }}>Logout</Button>
          </Box>
        </>
      )}
      <div>
        {message}
      </div>
    </Box>
  );
}
