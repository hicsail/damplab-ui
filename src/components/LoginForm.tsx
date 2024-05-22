import { useState, useEffect } from 'react';
import { Box, Button, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function LoginForm() {
  const demo_admin  = { username: 'admin',     password: 'drafty-shotgun-exorcist', role: 'admin' };
  const demo_client = { username: 'demo_user', password: 'demo_user_password',      role: 'client' };

  const navigate = useNavigate();

  const [message,  setMessage]  = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [role,     setRole]     = useState('');

  useEffect(() => {
    const loginInfo = JSON.parse(sessionStorage.getItem('login_info') || '{}');
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

    sessionStorage.setItem('login_info', JSON.stringify(loginInfo));
    setLoggedIn(loginInfo.loggedIn);
    setRole(loginInfo.role);
    setMessage(loginInfo.loggedIn ? 'Login Succeeded' : 'Login Failed');

    if (loginInfo.loggedIn) {
      navigate(loginInfo.role === 'admin' ? '/dashboard' : '/canvas');
    }
  };

  const clickedLogout = () => {
    sessionStorage.removeItem('login_info');
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
    <Box sx={{ display: 'flow', justifyContent: 'center', textAlign: 'center' }}>
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
            <Button variant="contained" onClick={clickedLogin} type="submit">Login</Button>
          </div>
        </>
      ) : (
        <>
          <div>
            <p>You are logged in as {role}.</p>
            {/* <Button variant="contained" onClick={() => navigate(role === 'admin' ? '/dashboard' : '/canvas')} style={{ marginRight: 10 }}>
              Go to {role === 'admin' ? 'Dashboard' : 'Canvas'}
            </Button> */}
            <Button variant="contained" onClick={() => navigate('/canvas')} style={{ marginRight: 10 }}>
              Go to Canvas
            </Button>
            {role === 'admin' ? 
              <>
                <Button variant="contained" onClick={() => navigate('/dashboard')} style={{ marginRight: 10 }}>Go to Dashboard Page</Button> 
                {/* <Button variant="contained" onClick={() => navigate('/dominos')}   style={{ marginRight: 10 }}>Go to Dominos Page</Button> 
                <Button variant="contained" onClick={() => navigate('/elabs')}     style={{ marginRight: 10 }}>Go to eLabs Site</Button> 
                <Button variant="contained" onClick={() => navigate('/kernel')}    style={{ marginRight: 10 }}>Go to Kernel Site</Button>  */}
              </>
              : ''
            }
            <Button variant="contained" onClick={clickedLogout}>Logout</Button>
          </div>
        </>
      )}
      <div>
        {message}
      </div>
      {role === 'admin' && loggedIn === true ?
        <div style={{textAlign: 'left', color: 'grey'}}>
          <br/><br/><br/><br/><br/>
          <p><b>Notes for DAMP Lab Technicians and Admins: </b></p>
          <ul>
            <li>The Kernel API is still not available or integrated, so most of the biosecurity screening is faked.</li>
            <li>There is a client login and an admin login. If you're seeing this, you're logged in as an admin.</li>
            <li>Currently, clients can only access the canvas, checkout, and submission confirmation screens.</li>
            <li>Admins can access all pages, including the dashboard, which links to a detailed view for every submitted job.</li>
            <li>If you have any questions/suggestions/issues regarding the site, please contact Chris Krenz at ckrenz@bu.edu.</li>
          </ul>
        </div>
        : ''
      }
    </Box>
  );
}
