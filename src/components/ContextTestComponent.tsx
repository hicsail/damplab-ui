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
export default function ContextTestComponent() {

    const val = useContext(CanvasContext);
    const [activeNode, setActiveNode] = useState(val.nodes.find((node: any) => node.id === val.activeComponentId));
    const [nodeParams, setNodeParams] = useState<Array<any>>([]);
    const [inputParams, setInputParams] = useState<Array<any>>([]);
    const [additionalInstructions, setAdditionalInstructions] = useState('');
    const [openToast, setOpenToast] = useState(false);

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
        },
    });

    const buildParamsForm = (params: any) => {

        // take data from val.data.params and build a form
        let form = params.map((param: any) => {
            return (
                <div>
                    <TextField
                        label={param.name}
                        variant="outlined"
                        value={param.value}
                        onChange={(e) => {
                            param.value = e.target.value;
                            setNodeParams(params);
                        }}
                    />
                </div>
            )
        })
    }


    const addParamFromInput = (event: any, nodeParam: any) => {
        let value: any = event.target.value;
        let param: any = nodeParam.id;
        if (value && value.length > 0) {
            // if value exists in nodeParams, update it, otherwise add it
            if (nodeParams.find((nodeParam: any) => nodeParam.id === param)) {
                setNodeParams((nodeParams: any) => nodeParams.map((nodeParam: any) => {
                    if (nodeParam.id === param) {
                        return {
                            ...nodeParam,
                            value: value
                        }
                    } else {
                        return nodeParam;
                    }
                }))
            } else {
                setNodeParams((nodeParams: any) => [...nodeParams, { id: param, value: value }]);
            }
        } else {
            // if value is empty, remove it from nodeParams
            setNodeParams((nodeParams: any) => nodeParams.filter((nodeParam: any) => nodeParam.id !== param));
        }
    }

    const addInputParamFromInput = (event: any, nodeParam: any) => {

        let value: any = event.target.checked;
        let param: any = nodeParam;

        // if value exists in nodeParams, update it, otherwise add it
        if (inputParams.find((nodeParam: any) => nodeParam.id === param)) {
            setInputParams((inputParams: any) => inputParams.map((nodeParam: any) => {
                if (nodeParam.id === param) {
                    return {
                        ...nodeParam,
                        value: value
                    };
                } else {
                    return nodeParam;
                }
            }))
        } else {
            setInputParams((inputParams: any) => [...inputParams, { id: param, value: value }]);
        }

    }

    const buildFormikForm = (formData: any) => {

        return (
            <div>
                <form onSubmit={formik.handleSubmit}>
                    {
                        formData ? formData.map((param: any) => {
                            if (param.paramType === 'input') {
                            return (
                                <div>
                                    <TextField
                                        style={{ margin: 10}}
                                        label={param.name}
                                        variant="outlined"
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
                                   { param.name }<Checkbox 
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
                                    <Button type="submit">Submit</Button>
                                ): null
                            
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

    const checkIfNodeParamsExist = () => {

        const node = activeNode?.data;
        const inputBase = node?.inputBaseParams;
        const inputResult = node?.inputResultParams;
        const params = node?.params;

        // loop over params and check if they dont exist in inputBase, add { id: param, value: '' } to inputBaseParams
        if (params && inputBase) {
            params.forEach((param: any) => {
                if (!node?.inputBaseParams.find((input: any) => input.id === param)) {
                    node?.inputBaseParams.push({ id: param, value: '' });
                }
            })
        }
    }


    const resetParams = () => {

        setNodeParams([]);
        setInputParams([]);
        setAdditionalInstructions('');
        checkIfNodeParamsExist();
    }


    useEffect(() => {
        if (compare()) {

        } else {
            alert('unsaved params');
        }
        setActiveNode(val.nodes.find((node: any) => node.id === val.activeComponentId));
    }, [val.activeComponentId]);

    useEffect(() => {
        resetParams();
        // dont add
        // const formik = useFormik({
        //     initialValues: getInitValues(),
        //     onSubmit: (values) => {
        //         console.log(values);
        //     },
        // });
        // const vals = getInitValues('formik');
        // formik.setValues({
        //     ...formik.values,
        //     ...vals
        // });
        console.log(formik.values);
    }, [activeNode]);


    const getNodeFromId = (id: string) => {
        return services.find((node: any) => node.id === id);
    }

    const getValueForParam = (param: any) => {

        const id = param.id;
        const nodeParams = activeNode?.data.inputBaseParams;
        for (let i = 0; i < nodeParams.length; i++) {
            if (nodeParams[i].id === id) {
                return nodeParams[i].value;
            }
        }

        return '';
    }

    const save = async () => {

        writeToParamsContext();
        // save nodeParams to activeNode.data.inputParams
        // setActiveNode((activeNode: any) => {
        //     const nodeTemp = {
        //         ...activeNode,
        //         data: {
        //             ...activeNode.data,
        //             additionalInstructions: additionalInstructions,
        //             inputBaseParams: nodeParams,
        //             inputResultParams: inputParams
        //         }
        //     }

        //     val.setNodes((nodes: any) => nodes.map((node: any) => {
        //         if (node.id === activeNode?.id) {
        //             return nodeTemp;
        //         } else {
        //             return node;
        //         }
        //     }));
        //     handleClick();
        //     return nodeTemp;
        // });
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
            <h2>
                {activeNode?.data.label}
            </h2>
            <div>
                {
                    activeNode && activeNode.data.parameters.length > 0 ? (
                        <h3>Params</h3>
                    ) : null
                }
                {
                    activeNode && activeNode.data.parameters.length > 0 ? (activeNode.data.parameters.map((param: any) => {

                        // nodeParams is an array of { id: param, value: '' }
                        // if param exists in nodeParams, use that value, otherwise use ''
                        const val = getValueForParam(param);
                        if (param.type === 'string') return (
                            <div style={{ margin: 5 }}>
                                <TextField id="outlined-basic" placeholder={val ? val : null} label={param.name} variant="outlined" style={{ width: 200 }} onChange={(e) => addParamFromInput(e, param)} />
                            </div>
                        )

                        if (param.type === 'number') return (
                            <div style={{ margin: 5 }}>
                                <TextField id="outlined-basic" label={param.name} variant="outlined" type="number" onChange={(e) => addParamFromInput(e, param)} />
                            </div>
                        )

                    })) : null
                }
            </div>
            <div>
                {
                    activeNode && activeNode.data.resultParams && activeNode.data.resultParams.length > 0 ? (
                        <h3>Result Params</h3>
                    ) : null
                }
                <FormGroup>
                    {
                        activeNode && activeNode.data.resultParams && activeNode.data.resultParams.length > 0 ? (activeNode.data.resultParams.map((param: any) => {
                            return (
                                <FormControlLabel control={<Checkbox />} label={param} onChange={(e) => addInputParamFromInput(e, param)} />
                            )
                        })) : null
                    }
                </FormGroup>
                {
                    activeNode && activeNode.data.resultParams && activeNode.data.resultParams.length > 0 ? (
                        <div>
                            <h3>Additional Instructions</h3>
                            <Input multiline rows={4} onChange={(e) => setAdditionalInstructions(e.target.value)} />
                        </div>

                    ) : null
                }
            </div>
            <div>
                {
                    // return header with text Allowed Connections if allowedConnections list is not empty
                    activeNode && activeNode.data.allowedConnections && activeNode.data.allowedConnections.length > 0 ? (
                        <h3>
                            Allowed Connections
                        </h3>
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
                    buildFormikForm(activeNode?.data.formData)
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
