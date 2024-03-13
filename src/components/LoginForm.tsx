import { useState } from 'react'
import { Box, Button, TextField } from '@mui/material';


// import { useNavigate } from "react-router-dom";
// const navigate = useNavigate();
// 
// function CheckLogin() {
//     const checkLoginStatus = () => {
//         const loginInfo = JSON.parse(localStorage.getItem('login_info') || '{}');
//         if (loginInfo.loginStatus != true) {
//             navigate('/login');
//             return false
//         } else {
//             return true
//         }
//     };
// }

export default () => {

    const demo_username: string = 'foo';
    const demo_password: string = 'bar';

    const [message,  setMessage]  = useState('');

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loggedIn, setLoggedIn] = useState(false);

    interface LoginInfo {
        username: string;
        password: string;
        time: any;
        loggedIn: boolean;
    }

    const clickedLogin = () => {

        let loginInfo: LoginInfo = {
            username: username,
            password: password,
            time: null,
            loggedIn: false,
        }

        if (loginInfo.username == demo_username && loginInfo.password == demo_password) {
            sessionStorage.setItem('login_info',  JSON.stringify(loginInfo));
            console.log('Login succeeded');
            setLoggedIn(false);
            setMessage('Login Succeeded');
        } else {
            console.log('Login failed');
            setLoggedIn(true);
            setMessage('Login Failed');
        }

    }

    return ( 
        <Box sx={{ display: 'flow', justifyContent: 'center', textAlign: 'center' }}>
            <div>
                <TextField id="outlined-basic" label="Username" variant="outlined" sx={{ m:1 }}
                    onChange={(entry: any) => setUsername(entry.target.value)}/>
            </div>
            <div>
                <TextField id="outlined-basic" label="Password" variant="outlined" sx={{ m:1 }}
                    onChange={(entry: any) => setPassword(entry.target.value)}/>
            </div>
            <div style={{ margin: 20 }}>
                <Button variant="contained" onClick={clickedLogin}>Login</Button>
            </div>
            <div>
                {message}
            </div>
        </Box>
    );
}
