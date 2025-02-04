import React, { useState, useEffect, useContext } from 'react'
import { Link, useNavigate } from "react-router-dom";
import { AppBar, Button, Dialog, DialogTitle, IconButton, TextField, Toolbar, Hidden } from '@mui/material';
import { SaveOutlined }         from '@mui/icons-material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import UploadFileIcon           from '@mui/icons-material/UploadFile';
import Snackbar from '@mui/material/Snackbar';
import { CanvasContext } from '../contexts/Canvas';
import "../styles/resubmit.css";

interface DialogProps {
    open: boolean;
    onClose: (value?: string) => void;
    loadCanvas?: any;
}

export default function HeaderBar() {
    const navigate = useNavigate();

    const [saveOpen, setSaveOpen] = useState(false);
    const [loadOpen, setLoadOpen] = useState(false);

    // TODO: Flesh out snackbar
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("Test Message");

    const { setNodes, setEdges, nodes, edges } = useContext(CanvasContext);

    const handleSaveOpen = () => {
        setSaveOpen(true);
    };

    const handleLoadOpen = () => { 
        navigate('/canvas');
        setLoadOpen(true);
    }


    // Whenver an exit event is called from saving or loading, update current canvas
    const handleClose = (value = "canvas:") => {
        if (localStorage.getItem(value)) {
            localStorage.setItem("CurrentCanvas", value);
        }

        setSaveOpen(false);
        setLoadOpen(false);
    };

    
    const loadCanvasData = (canvasName: string) => {
        // Attempt to load file, load empty object if nothing found
        let file = JSON.parse(localStorage.getItem(canvasName) || '{}');

        if (file.nodes) setNodes(file.nodes);
        if (file.edges) setEdges(file.edges);
    }

    // Checks to see the CurrentCanvas that is present in local storage
    useEffect(() => {
        const currentCanvas = localStorage.getItem("CurrentCanvas");
        // If not present, set key and return
        if (!currentCanvas) {
            localStorage.setItem("CurrentCanvas", "");
            return;
        }
        // If canvas exists, load it into storage
        if(localStorage.getItem(currentCanvas)) {
            loadCanvasData(currentCanvas);
        }
    }, [])

    function SaveDialaog(props: DialogProps ) {
        const { onClose, open } = props;
        const [fileName, setFileName] = useState('');

        // Proper exit: user clicked save
        const handleSave = () => {
            // create object with filename, nodes, edges and save to local storage
            let file = {
                fileName: fileName,
                nodes: nodes,
                edges: edges,
            }
            // Apply prefix to filename for localStorage key
            const key = "canvas:" + fileName
            console.log(key)
            localStorage.setItem(key, JSON.stringify(file));
            onClose(key);
            setSnackbarOpen(true)
        };
    
        return (
          <Dialog onClose={() => onClose()} open={open}>
            <div style={{width: 300, height: 200, padding: 10}}>
                <DialogTitle>Save Canvas</DialogTitle>
                <div>
                    <TextField id="outlined-basic" label="File name" variant="outlined" onChange={(e)=> setFileName(e.target.value)}/>
                </div>
                <div style={{ margin: 20 }}>
                    <Button variant="contained" onClick={handleSave}>Save</Button>
                </div>
            </div>
          </Dialog>
        );
    }

    function LoadDialog(props: DialogProps ) {
        const { onClose, open, loadCanvas } = props;
        
        // Proper Exit: user selected a file to load
        const handleLoad = (fileName: any) => {
            // get file from local storage and load it into the canvas
            
            onClose(fileName);
            loadCanvas(fileName);
        };
      
        // Get all of they keys of canvas files the user has saved. These files begin with the string canvas: 
        // This is done to prevent showing unwanted local storage variables in load screen
        let files = Object.keys(localStorage).filter(key => key.startsWith("canvas:"));
       
        return (
          <Dialog onClose={() => onClose()} open={open}>
            <DialogTitle>Load Canvas</DialogTitle>
            <div style={{width: 450, height: 200, padding: 10}}>
            {files.length === 0 ? <div style={{display: 'flex', justifyContent: 'center'}}>Create and save your first canvas!</div>:
                (files.map((file) => {
                    return (
                        <div key={Math.random().toString(36).substring(2, 9)} style={{margin: 10}}>
                            {/* A substring of 7 is applied so the prefix "canvas:" isn't displayed */}
                            <Button variant="contained" onClick={()=> handleLoad(file)}>{file.substring(7)}</Button>
                        </div>
                    )
                }))
            }
            </div>
          </Dialog>
        );
    }


    return (
        <div>
            <AppBar position="fixed">

                <Toolbar style={{background: 'black'}}>

                    <Hidden mdDown>
                        <Button onClick={() => window.location.href = "https://damplab.org/services"} style={{ textDecoration: 'none', color: 'white', marginRight: 'auto' }}>
                            <img src="https://static.wixstatic.com/media/474df2_ec8549d5afb648c692dc6362a626e406~mv2.png/v1/fill/w_496,h_76,al_c,lg_1,q_85,enc_auto/BU_Damp_Lab_Subbrand_Logo_WEB_whitetype.png" 
                                style={{width: 250}} alt="BU_Damp_Lab_Subbrand_Logo_WEB_whitetype.png"  />
                        </Button>
                    </Hidden>

                    <Button onClick={() => navigate("/")} style={{ textDecoration: 'none', color: 'white', textTransform: 'none'}}>
                        <img src="damp-white-text.svg" style={{height: '45px'}} alt="DAMP Logo"/>
                        <span style={{marginLeft: '15px', fontSize: 21, fontWeight: 'bold', color: '#8fb5ba', marginBottom: '-2px'}}>  {/*cyan: #8fb5ba, pink: #e04462*/}
                            WORKFLOW<span style={{fontWeight: '200'}}>designer</span>
                        </span>
                        <span style={{fontSize: 15, marginLeft: '10px', marginBottom: '-7px'}}>
                            v1.0
                        </span>
                    </Button>

                    <div style={{ marginLeft: 'auto', marginRight: 10 }}>
                        
                        <IconButton onClick={handleLoadOpen} title="Load canvas" aria-controls='menu-appbar' aria-haspopup='true'>
                            <UploadFileIcon style={{color: 'white'}}/>
                        </IconButton>

                        <IconButton onClick={handleSaveOpen} title="Save canvas" aria-controls='menu-appbar' aria-haspopup='true'>
                            <SaveOutlined style={{color: 'white'}}/>
                        </IconButton>

                        {window.location.href.includes('resubmission')
                        ? <Link to="/checkout" className="a a--hover a--active">Resubmit...</Link>
                        : <IconButton onClick={() => navigate("/checkout")} title="Checkout page" aria-controls='menu-appbar' aria-haspopup='true'>
                            <ShoppingCartOutlinedIcon style={{color: 'white'}}/>
                          </IconButton>}

                    </div>

                </Toolbar>

                <SaveDialaog
                    open          = {saveOpen}
                    onClose       = {handleClose}
                />
                
                <LoadDialog
                    open          = {loadOpen}
                    onClose       = {handleClose}
                    loadCanvas = {loadCanvasData}
                />

            </AppBar>
            <Toolbar /> 
            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => {setSnackbarOpen(false)}} message={snackbarMessage}/>
        </div>
    )
}
