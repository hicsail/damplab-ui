import React, { useState, useContext, useEffect } from 'react'
import { CanvasContext } from '../contexts/Canvas'
import TextField from '@mui/material/TextField';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import NodeButton from './NodeButton';
import { services } from '../data/services';
import { Button, Input } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

import { getIn, useFormik } from 'formik';
import { Check } from '@mui/icons-material';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';


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
        setOpen(false);
    };

    const getInitValues = (str: string) => {
        let initValues: any = {};
        activeNode?.data.formData.forEach((param: any) => {
            initValues[param.id] = param.value;
        })

        return initValues;
    }

    const formik = useFormik({
        initialValues: getInitValues('here'),
        onSubmit: (values) => {
            console.log(values);
            save();
        },
    });

    const buildFormikForm = (formData: any) => {

        return (
            <div>
                <div>
                    {
                        formData ? (
                            <h2>
                                Parameters
                            </h2>
                        ) : null
                    }
                </div>
                <form onSubmit={formik.handleSubmit}>
                    {
                        formData ? formData.map((param: any) => {
                            if (param.paramType === 'input' && param.type === 'string') {
                                return (
                                    <div>
                                        <TextField
                                            style={{ margin: 10 }}
                                            label={param.name}
                                            variant="outlined"
                                            type="text"
                                            value={formik.values[param.id] ? formik.values[param.id] : ''}
                                            onChange={formik.handleChange}
                                            name={param.id}
                                        />
                                    </div>
                                )
                            }
                            if (param.paramType === 'input' && param.type === 'number') {
                                return (
                                    <div>
                                        <TextField
                                            style={{ margin: 10 }}
                                            label={param.name}
                                            variant="outlined"
                                            type="number"
                                            value={formik.values[param.id] ? formik.values[param.id] : ''}
                                            onChange={formik.handleChange}
                                            name={param.id}
                                        />
                                    </div>
                                )
                            }
                            if (param.paramType === 'result') {
                                return (
                                    <>
                                        {param.name}<Checkbox
                                            name={param.id}
                                            checked={formik.values[param.id] ? formik.values[param.id] : false}
                                            onChange={formik.handleChange}
                                        />
                                    </>
                                )
                            }

                        }) : null

                    }
                    <div>
                        {
                            formData ?
                                (
                                    <Button type="submit">Save</Button>
                                ) : null

                        }
                    </div>
                </form>
            </div>
        )
    }

    const writeToParamsContext = () => {

        // loop over formik.values and update params in context
        console.log(formik.values);
        for (const [key, value] of Object.entries(formik.values)) {
            const id = key;
            // find param in activeNode.nodes.data.formData
            console.log(activeNode?.data.formData);
            const param = activeNode?.data.formData.find((param: any) => param.id === id);
            if (param) param.value = value;
        }

    }

    const compare = () => {

        // compare activeNode.data.formData with formik.values
        let formData = activeNode?.data.formData;
        let formikValues = formik.values;
        let formikKeys = Object.keys(formikValues);
        console.log(formikKeys);
        let returnVal = true;
        // loop over formData list and match id with formikKeys and compare values
        formData?.forEach((param: any) => {

            if (formikKeys.includes(param.id)) {
                console.log('hello');
                if (param.value !== formikValues[param.id]) {
                    console.log('values are different');
                    returnVal = false;
                    return
                }
            }
        });

        return returnVal;
    }





    useEffect(() => {
        if (compare()) {

        } else {
            alert('unsaved params');
        }
        setActiveNode(val.nodes.find((node: any) => node.id === val.activeComponentId));
    }, [val.activeComponentId]);

    useEffect(() => {
        console.log(formik.values);
    }, [activeNode]);


    const getNodeFromId = (id: string) => {
        return services.find((node: any) => node.id === id);
    }



    const save = async () => {
        writeToParamsContext();
    }

    const print = () => {
        // find node in val.nodes and update it using setNodes
        console.log(compare());
        console.log(formik.values);
        console.log(val.nodes);
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
            <div>
                {
                    buildFormikForm(activeNode?.data.formData)
                }
            </div>
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
                            <NodeButton node={getNodeFromId(connection)} />
                        )
                    })) : null
                }
            </div>
            <div>
                {
                    activeNode ? (
                        <>
                            <Button onClick={() => save()}>
                                Save
                            </Button>
                            <Snackbar
                                open={openToast}
                                autoHideDuration={3000}
                                onClose={handleCloseToast}
                                message="Parameters Saved"
                                action={action}
                                key={'bottom' + 'right'}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            />
                            <Button onClick={() => print()}>
                                print
                            </Button>
                            <Button variant="outlined" onClick={handleClickOpen}>
                                Open alert dialog
                            </Button>
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
                                    <Button onClick={handleClose} autoFocus>
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
