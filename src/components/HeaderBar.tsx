import React, { useState, useContext } from 'react'
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import IconButton from '@mui/material/IconButton';
import { Outlet, Link } from "react-router-dom";
import { SaveOutlined } from '@mui/icons-material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import { TextField } from '@mui/material';
import { CanvasContext } from '../contexts/Canvas';
import { useParams } from 'react-router-dom';
import "../styles/resubmit.css";


export default function HeaderBar() {

    const alignRight = {
        marginLeft: 'auto',
        marginRight: 10,
        //width: 'fit-content',
    };

    interface SimpleDialogProps {
        open: boolean;
        selectedValue: string;
        onClose: (value: string) => void;
        setNodes? : any;
        setEdges? : any;
        setLoadOpen? : any;
    }

    const [open, setOpen] = useState(false);
    const [loadOpen, setLoadOpen] = useState(false);

    const { setNodes, setEdges, nodes, edges } = useContext(CanvasContext);

    const handleClickOpen = () => {
        console.log('open');
        setOpen(true);
    };

    const handleClose = (value: string) => {
        setOpen(false);
    };

    const handleLoadOpen = () => { 
        setLoadOpen(true);
    }

    function SimpleDialog(props: SimpleDialogProps ) {
        const { onClose, selectedValue, open } = props;
        const [fileName, setFileName] = useState('');
        const handleClose = () => {
            // create object with filename, nodes, edges and save to local storage
            let file = {
                fileName: fileName,
                nodes: nodes,
                edges: edges,
            }
            localStorage.setItem(fileName, JSON.stringify(file));
            onClose(selectedValue);
        };
      
        const handleListItemClick = (value: string) => {
          onClose(value);
        };
    
      


        return (
          <Dialog onClose={handleClose} open={open}>
            <div style={{width: 300, height: 200, padding: 10}}>
            <DialogTitle>Save Progress</DialogTitle>
            <div>
            <TextField id="outlined-basic" label="File name" variant="outlined" onChange={(e)=> setFileName(e.target.value)}/>
            </div>
            <div style={{ margin: 20 }}>
            <Button variant="contained" onClick={handleClose}>Save</Button>
            </div>
            </div>
          </Dialog>
        );
    }

    function LoadDialog(props: SimpleDialogProps ) {
        const { onClose, selectedValue, open, setNodes, setEdges, setLoadOpen } = props;
        
        const handleClose = (fileName: any) => {
            // get file from local storage and load it into the canvas
            let file = JSON.parse(localStorage.getItem(fileName) || '{}');
            
            onClose(selectedValue);
            if (file.nodes) setNodes(file.nodes);
            // console.log("Load nodes: ", file.nodes);
            if (file.edges) setEdges(file.edges);
            // console.log("Load edges: ", file.edges);
            setLoadOpen(false);
        };
      
        const handleListItemClick = (value: string) => {
          onClose(value);
        };

        // get list of saved files from local storage
        let files = [];
        for (let i = 0; i < localStorage.length; i++) {
            files.push(localStorage.key(i));
        }

        return (
          <Dialog onClose={handleClose} open={open}>
            <DialogTitle>Load Draft</DialogTitle>
            <div style={{width: 300, height: 200, padding: 10}}>
            {
                files.map((file) => {
                    return (
                        <div key={Math.random().toString(36).substring(2, 9)} style={{margin: 10}}>
                            <Button variant="contained" onClick={()=> handleClose(file)}>{file}</Button>
                        </div>
                    )
                })
            }
            </div>
          </Dialog>
        );
    }

    return (
        <div>
            <AppBar position="static">
                <Toolbar style={{background: 'black'}}>
                    <Link to={"/"} style={{ textDecoration: 'none', color: 'white' }}>
                    <img src="https://static.wixstatic.com/media/474df2_ec8549d5afb648c692dc6362a626e406~mv2.png/v1/fill/w_496,h_76,al_c,lg_1,q_85,enc_auto/BU_Damp_Lab_Subbrand_Logo_WEB_whitetype.png" style={{width: 300}} alt="BU_Damp_Lab_Subbrand_Logo_WEB_whitetype.png"  />
                    </Link>
                    <div>
                            v1.0
                        </div>
                    <div style={alignRight}>
                        
                    <IconButton
                        size="large"
                        aria-label="account of current user"
                        aria-controls="menu-appbar"
                        aria-haspopup="true"
                        color="inherit"
                        onClick={handleLoadOpen}
                    >
            
                            <UploadFileIcon style={{color: 'white'}}/>
                        
                    </IconButton>
                    <IconButton
                        size="large"
                        aria-label="account of current user"
                        aria-controls="menu-appbar"
                        aria-haspopup="true"
                        color="inherit"
                        onClick={handleClickOpen}
                    >
            
                            <SaveOutlined style={{color: 'white'}}/>
                        
                    </IconButton>
                        {window.location.href.includes('resubmission')
                        ? <Link to="/checkout" className="a a--hover a--active">Resubmit...</Link>
                        : <IconButton 
                            size="large"
                            aria-label="account of current user"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            color="inherit"
                        >
                            <Link to="/checkout"><ShoppingCartOutlinedIcon style={{color: 'white'}}/></Link> 
                        </IconButton>}
                    </div>
                </Toolbar>
                <SimpleDialog
                    selectedValue={'test'}
                    open={open}
                    onClose={handleClose}
                />
                <LoadDialog
                    selectedValue={'test'}
                    open={loadOpen}
                    setLoadOpen={setLoadOpen}
                    onClose={handleClose}
                    setNodes={setNodes}
                    setEdges={setEdges}
                />
            </AppBar>
        </div>
    )
}
