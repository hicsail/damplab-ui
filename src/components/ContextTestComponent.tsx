import React, { useState, useContext, useEffect } from 'react'
import { CanvasContext } from '../contexts/Canvas'
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import NodeButton from './NodeButton';
import { services } from '../data/services';
import { Button, Input } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useFormik } from 'formik';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import ParamsForm from './ParamsForm';

export default function ContextTestComponent() {

    const val = useContext(CanvasContext);
    const [activeNode, setActiveNode] = useState(val.nodes.find((node: any) => node.id === val.activeComponentId));
    const [additionalInstructions, setAdditionalInstructions] = useState('');
    const [openToast, setOpenToast] = useState(false);
    const [open, setOpen] = useState(false);

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        // put logic to discard changes here
        setOpen(false);
    };

    const handleSave = () => {
        handleClose();
        save();
        setOpenToast(true);
    }

    const getInitValues = () => {
        let initValues: any = {};
        activeNode?.data.formData.forEach((param: any) => {
            initValues[param.id] = param.value;
        });
        
        initValues[`addinst${activeNode?.data.id}`] = activeNode?.data.additionalInstructions;
        return initValues;
    }

    const formik = useFormik({
        initialValues: getInitValues(),
        onSubmit: (values) => {
            save();
        },
    });

    

    const writeToParamsContext = () => {

        // loop over formik.values and update params in context
        for (const [key, value] of Object.entries(formik.values)) {
            const id = key;
            // find param in activeNode.nodes.data.formData
            const param = activeNode?.data.formData.find((param: any) => param.id === id);
            if (param) param.value = value;
        }

        if (activeNode && additionalInstructions) {
            activeNode.data.formData['additionalInstructions'] = additionalInstructions;
        }
    }

    const compare = () => {

        // compare activeNode.data.formData with formik.values
        let formData = activeNode?.data.formData;
        let formikValues = formik.values;
        let formikKeys = Object.keys(formikValues);
        let returnVal = true;
        // loop over formData list and match id with formikKeys and compare values
        formData?.forEach((param: any) => {

            if (formikKeys.includes(param.id)) {
                console.log('hello');
                if (param.value !== formikValues[param.id]) {
                    returnVal = false;
                    return
                }
            }
        });

        return returnVal;
    }

    useEffect(() => {
        if (compare()) {
            setActiveNode(val.nodes.find((node: any) => node.id === val.activeComponentId));
        } else {
            handleClickOpen();
        }

    }, [val.activeComponentId]);

    const getNodeFromId = (id: string) => {
        return services.find((node: any) => node.id === id);
    }

    const save = async () => {
        setOpenToast(true);
        writeToParamsContext();
    }

    const handleClick = () => {
        setOpenToast(true);
    };

    const handleCloseToast = (event: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpenToast(false);
    };

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
                            <NodeButton key={Math.random().toString(36).substring(2, 9)} node={getNodeFromId(connection)} />
                        )
                    })) : null
                }
            </div>
            <div>
                {
                    activeNode ? (
                        <>
                            {/* <Button onClick={() => save()}>
                                Save
                            </Button> */}
                            <Snackbar
                                open={openToast}
                                autoHideDuration={3000}
                                onClose={handleCloseToast}
                                message="Parameters Saved"
                                action={action}
                                key={'bottom' + 'right'}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            />
                            {/* <Button onClick={() => print()}>
                                print
                            </Button>
                            <Button variant="outlined" onClick={handleClickOpen}>
                                Open alert dialog
                            </Button> */}
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
