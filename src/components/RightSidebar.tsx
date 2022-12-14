import React, { useState, useContext, useEffect } from 'react'
import { CanvasContext } from '../contexts/Canvas'
import NodeButton from './NodeButton';
import { services } from '../data/services';
import { Button, Input } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import ParamsForm from './ParamsForm';
import { addNodeToCanvasWithEdge } from '../controllers/GraphHelpers';

export default function ContextTestComponent() {

    const val = useContext(CanvasContext);
    const [activeNode, setActiveNode] = useState(val.nodes.find((node: any) => node.id === val.activeComponentId));
    const [openToast, setOpenToast] = useState(false);
    const [open, setOpen] = useState(false);

    const handleClose = () => {
        // put logic to discard changes here
        setOpen(false);
    };

    const handleSave = () => {
        handleClose();
        setOpenToast(true);
    };

    useEffect(() => {
        // if (compare()) {
        setActiveNode(val.nodes.find((node: any) => node.id === val.activeComponentId));
        // } else {
        //     handleClickOpen();
        // }
    }, [val.activeComponentId]);

    const getServiceFromId = (id: string) => {
        return services.find((node: any) => node.id === id);
    }

    const handleCloseToast = (event: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpenToast(false);
    };

    // click on node button to add node and edge to canvas
        

    const action = (
        <React.Fragment>
            <Button color="secondary" size="small" onClick={handleCloseToast}>
                UNDO
            </Button>
            <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={handleCloseToast}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
        </React.Fragment>
    );

    return (
        <div style={{ wordWrap: 'break-word', padding: 10, overflow: 'scroll', height: '80vh' }}>
            {
                activeNode?.data.formData ? (
                    <div>
                        <ParamsForm activeNode={activeNode} />
                    </div>
                ) : null
            }
            <div>
                {
                    // return header with text Allowed Connections if allowedConnections list is not empty
                    activeNode && activeNode.data.allowedConnections && activeNode.data.allowedConnections.length > 0 ? (
                        <h2>
                            Allowed Connections
                        </h2>
                    ) : null
                }
                {
                    activeNode && activeNode.data.allowedConnections && activeNode.data.allowedConnections.length > 0 ? (activeNode.data.allowedConnections.map((connection: string) => {
                        return (
                            <NodeButton key={Math.random().toString(36).substring(2, 9)} node={getServiceFromId(connection)} sourceId={val.activeComponentId} setNodes={val.setNodes} setEdges={val.setEdges} sourcePosition={activeNode.position} setActiveComponentId={val.setActiveComponentId}/>
                        )
                    })) : null
                }
            </div>
            <div>
                {
                    activeNode ? (
                        <>
                            <Snackbar
                                open={openToast}
                                autoHideDuration={3000}
                                onClose={handleCloseToast}
                                message="Parameters Saved"
                                action={action}
                                key={'bottom' + 'right'}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            />
                            <Dialog
                                open={open}
                                onClose={handleClose}
                                aria-labelledby="alert-dialog-title"
                                aria-describedby="alert-dialog-description"
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
                    ) : (
                        <div>
                            Drag a node from the left to the canvas to see its properties here.
                        </div>
                    )
                }
            </div>
        </div>
    )
}
