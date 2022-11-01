import React from 'react'
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import IconButton from '@mui/material/IconButton';
import { Outlet, Link } from "react-router-dom";


export default function HeaderBar() {

    const alignRight = {
        marginLeft: 'auto',
        marginRight: 10,
    };

    return (
        <div>
            <AppBar position="static">
                <Toolbar style={{background: 'black'}}>
                    <Link to={"/"} style={{ textDecoration: 'none', color: 'white' }}>
                    <img src="https://static.wixstatic.com/media/474df2_ec8549d5afb648c692dc6362a626e406~mv2.png/v1/fill/w_496,h_76,al_c,lg_1,q_85,enc_auto/BU_Damp_Lab_Subbrand_Logo_WEB_whitetype.png" style={{width: 300}} alt="BU_Damp_Lab_Subbrand_Logo_WEB_whitetype.png"  />
                    </Link>
                    <IconButton
                        style={alignRight}
                        size="large"
                        aria-label="account of current user"
                        aria-controls="menu-appbar"
                        aria-haspopup="true"
                        color="inherit"
                    >
                        <Link to="/checkout">
                            <ShoppingCartOutlinedIcon style={{color: 'white'}}/>
                        </Link>
                    </IconButton>
                </Toolbar>
            </AppBar>
        </div>
    )
}
