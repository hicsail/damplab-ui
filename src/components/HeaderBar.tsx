import { useState, useEffect, useContext, useCallback } from 'react'
import { Link, useNavigate } from "react-router-dom";
import { AppBar, Button, IconButton, Toolbar, Hidden, Alert } from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import Snackbar from '@mui/material/Snackbar';
import { CanvasContext } from '../contexts/Canvas';
import LoadCanvasButton from './LoadCanvasButton';
import SaveCanvasButton from './SaveCanvasButton';
import "../styles/resubmit.css";

export default function HeaderBar() {
    const navigate = useNavigate();

    // If snackbarMessage starts with "Success", then the snackbar will be green, otherwise it will be red to show an error.
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");

    const { setNodes, setEdges, nodes, edges } = useContext(CanvasContext);

    // This function is responsible for keeping currentCanvas up to date, it is called when user saves or loads a canvas.
    const updateCurrentCanvas = (canvasName = "") => {
        // If canvas name was provided and exists in local storage, update CurrentCanvas
        if (canvasName !== "" && localStorage.getItem(canvasName)) {
            localStorage.setItem("CurrentCanvas", canvasName);
        }
    };

    // When snackbar is opened, set its message and set open useState to true
    const handleSnackbarOpen = (message: string) => {
        setSnackbarMessage(message);
        setSnackbarOpen(true);
    }

    // When closing, don't erase the message or else the snackbar will change color while playing the closing animation.
    // Because of this, we simply set the snackbarOpen state to false
    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    }

    const areChangesUnsaved = useCallback(() => {
        // Get the name of current work from local storage, or the default value if it's empty
        let currentCanvas = localStorage.getItem("CurrentCanvas") || "canvas:";

        // Extract saved nodes and edges from local storage.
        let { nodes: savedNodes, edges: savedEdges } = JSON.parse(localStorage.getItem(currentCanvas) || '{}');
        
        if (currentCanvas === "canvas:" && (nodes.length > 0 || edges.length > 0)) {
            // Case 1: No canvas selected and there is content on the graph - Yes, changes are unsaved.
            return true;
        } else if (currentCanvas === "canvas:") {
            // Case 2: No canvas is selected and there is nothing on the graph - No changes made.
            return false;
        } else if (JSON.stringify(savedNodes) !== JSON.stringify(nodes) || JSON.stringify(savedEdges) !== JSON.stringify(edges)) {
            // Case 3: Current canvas content does not match saved content - Yes, changes are unsaved.
            return true;
        } else {
            // Case 4: If we are here, this means a canvas has been loaded - but no changes made.
            return false;
        }
    }, [edges, nodes])
    
    const loadCanvasData = useCallback((canvasName = "canvas:") => {
        // Update currentCanvas to new canvas
        updateCurrentCanvas(canvasName)

        // Attempt to load file, load empty object if nothing found
        let file = JSON.parse(localStorage.getItem(canvasName) || '{}');

        if (file.nodes) setNodes(file.nodes);
        if (file.edges) setEdges(file.edges);
    }, [setNodes, setEdges])

    // Checks to see the CurrentCanvas that is present in local storage. Only runs once on page load.
    useEffect(() => {
        const currentCanvas = localStorage.getItem("CurrentCanvas");

        // If not present, set key and exit
        if (!currentCanvas) {
            localStorage.setItem("CurrentCanvas", "");
            return;
        }

        // If canvas exists, load it into storage. Otherwise, reset current canvas as the canvas its referencing no longer exists.
        if(localStorage.getItem(currentCanvas)) {
            loadCanvasData(currentCanvas);
        } else {
            localStorage.setItem("CurrentCanvas", "");
        }
    }, [loadCanvasData])

    // This hook is responsible for applying the event listener for browser close on the canvas page.
    useEffect (() => {
        const handleUnsavedWork = (event: BeforeUnloadEvent) => {
            if (areChangesUnsaved()) {
                event.preventDefault();
                event.returnValue = ''; // Required for older browsers to show dialog
            }
        };
        window.addEventListener("beforeunload", handleUnsavedWork);
        return () => {
            window.removeEventListener("beforeunload", handleUnsavedWork);
        };
    }, [areChangesUnsaved])

    

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
                        
                        <LoadCanvasButton 
                            loadCanvas={loadCanvasData}
                            areChangesUnsaved={areChangesUnsaved}
                        />

                        <SaveCanvasButton
                            openSnackbar={handleSnackbarOpen}
                            updateCurrentCanvas={updateCurrentCanvas}
                        />

                        {window.location.href.includes('resubmission')
                        ? <Link to="/checkout" className="a a--hover a--active">Resubmit...</Link>
                        : <IconButton onClick={() => navigate("/checkout")} title="Checkout page" aria-controls='menu-appbar' aria-haspopup='true'>
                            <ShoppingCartOutlinedIcon style={{color: 'white'}}/>
                          </IconButton>}

                    </div>
                </Toolbar>
            </AppBar>
            <Toolbar /> 
            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}> 
                <Alert 
                    onClose={handleSnackbarClose}
                    severity={snackbarMessage.startsWith("Success") ? 'success' : 'error'}
                    variant='filled'
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                    </Alert>    
            </Snackbar>
        </div>
    )
}
