import React, { useState, useContext, useEffect } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText } from '@mui/material';
import Snackbar   from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import CloseIcon  from '@mui/icons-material/Close';
import { GppMaybe, WarningRounded } from '@mui/icons-material/';

import { getServiceFromId } from '../controllers/GraphHelpers';
import Params from './Params';
import NodeButton from './AllowedConnectionButton';
import { AppContext }    from '../contexts/App';
import { CanvasContext } from '../contexts/Canvas'


export default function ContextTestComponent() {

    const val                   = useContext(CanvasContext);
    const { services, hazards } = useContext(AppContext);

    const [activeNode, setActiveNode] = useState(val.nodes.find((node: any) => node.id === val.activeComponentId));
    const [openToast,  setOpenToast]  = useState(false);
    const [open,       setOpen]       = useState(false);

    const handleClose = () => {
        // put logic to discard changes here
        setOpen(false);
    };

    const handleSave = () => {
        handleClose();
        setOpenToast(true);
    };

    const handleCloseToast = (event: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpenToast(false);
    };

    useEffect(() => {
        setActiveNode(val.nodes.find((node: any) => node.id === val.activeComponentId));
    }, [val.activeComponentId]);

    const action = (
        <React.Fragment>
            <Button onClick={handleCloseToast} color="secondary" size="small">
                UNDO
            </Button>
            <IconButton onClick={handleCloseToast} size="small" color="inherit" aria-label="close">
                <CloseIcon fontSize="small" />
            </IconButton>
        </React.Fragment>
    );

    return (
        <div style={{ wordWrap: 'break-word', paddingLeft: 20, paddingRight: 20, overflow: 'scroll', height: '80vh', textAlign: 'left', }}>
            <div>
                {
                    hazards.includes(activeNode?.data.label) 
                    ? (<p><GppMaybe style={{color: "grey", verticalAlign:"bottom"}}/>&nbsp;Note: For this service, 
                       sequences provided below or produced by the process will undergo a safety screening.</p>)
                    : ""
                }
                <h2>
                    {activeNode?.data.label}
                </h2>
            </div>
            <div>
                {
                    activeNode?.data.description 
                    ? <p>{activeNode?.data.description}</p>
                    : null
                }
            </div>
            {
                activeNode?.data.formData 
                ? <div><Params activeNode={activeNode}/></div>
                : null
            }
            <div>
                {
                    // return header with text Allowed Connections if allowedConnections list is not empty
                    activeNode && activeNode.data.allowedConnections && activeNode.data.allowedConnections.length > 0 
                    ? <h3>Allowed Connections</h3>
                    : null
                }
                {
                    activeNode 
                    && activeNode.data.allowedConnections 
                    && activeNode.data.allowedConnections.length > 0 
                    ? (activeNode.data.allowedConnections.map((connection: any) => {
                        return (
                            <NodeButton 
                                key                  = {Math.random().toString(36).substring(2, 9)}
                                node                 = {getServiceFromId(services, connection.id)}
                                sourceId             = {val.activeComponentId}
                                setNodes             = {val.setNodes}
                                setEdges             = {val.setEdges}
                                sourcePosition       = {activeNode.position}
                                setActiveComponentId = {val.setActiveComponentId}
                            />
                        )
                    })) 
                    : null
                }
            </div>
            <div>
                {
                    activeNode 
                    ? (
                        <>
                            <Snackbar
                                open             = {openToast}
                                autoHideDuration = {3000}
                                onClose          = {handleCloseToast}
                                message          = "Parameters Saved"
                                action           = {action}
                                key              = {'bottom' + 'right'}
                                anchorOrigin     = {{ vertical: 'bottom', horizontal: 'right' }}
                            />
                            <Dialog
                                open             = {open}
                                onClose          = {handleClose}
                                aria-labelledby  = "alert-dialog-title"
                                aria-describedby = "alert-dialog-description"
                            >
                                <DialogContent>
                                    <DialogContentText id="alert-dialog-description">
                                        There are unsaved changes. Do you want to save them?
                                    </DialogContentText>
                                </DialogContent>
                                <DialogActions>
                                    <Button onClick={handleClose}>Discard</Button>
                                    <Button onClick={handleSave} autoFocus>
                                        Save
                                    </Button>
                                </DialogActions>
                            </Dialog>
                        </>
                    ) 
                    : <div>Drag a node from the left to the canvas to see its properties here.</div>
                }
            </div>
            <div>
                {/* <Button onClick={ ()=> console.log(JSON.stringify(val.nodes), JSON.stringify(val.edges))}><br/>Print</Button> */}
            </div>
        </div>
    )
}
