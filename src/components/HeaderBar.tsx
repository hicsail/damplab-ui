import React from 'react'
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import IconButton from '@mui/material/IconButton';



export default function HeaderBar() {

    const alignRight = {
        marginLeft: 'auto',
        marginRight: 10,
    };

    return (
        <div>
            <AppBar position="static">
                <Toolbar>
                    <h1>Damp Lab</h1>
                    <IconButton
                        style={alignRight}
                        size="large"
                        aria-label="account of current user"
                        aria-controls="menu-appbar"
                        aria-haspopup="true"
                        color="inherit"
                    >
                        <ShoppingCartOutlinedIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>
        </div>
    )
}
