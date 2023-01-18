import React, { useRef, useState, useEffect, useContext, useMemo } from 'react';
import { Formik, FormikContext, useFormik } from 'formik';
import { Button, Checkbox } from '@mui/material';
import { CanvasContext } from '../contexts/Canvas';
import { FlashOnRounded } from '@mui/icons-material';

export default function (props: any) {

    const val = useContext(CanvasContext);
    const [node, setNode] = useState(props.activeNode);
    const nodeData = node.data
    const [formData, setFormData] = useState(nodeData.formData);

    const [errors, setErrors] = useState<any>({});
    const [formDataState, setFormDataState] = useState<any>(formData);
    const [formValues, setFormValues] = useState<any>({});
    const [dataChange, setDataChange] = useState(false);
    let change : boolean = false;
    const getInitValues = () => {
        console.log("init form data", formData);
        let initValues: any = formValues;
        formData.forEach((obj: any) => {

            if (obj.paramType === 'result') {
                obj.value = obj.value ? obj.value : true;
                initValues[obj.id] = obj.value ? obj.value : true;
                
                obj.resultParamValue = obj.resultParamValue ? obj.resultParamValue : '';
                initValues[`resultParamValue${obj.id}`] = obj.resultParamValue ? obj.resultParamValue : '';
            }
            else initValues[obj.id] = obj.value ? obj.value : '';
            //setValuesInitiated([...valuesInitiated, obj.id]);
        });
        
        initValues[`addinst${node?.data.id}`] = node?.data.additionalInstructions ? node?.data.additionalInstructions : '';

        for (let key in initValues) {
            if (!(key in formValues)) {
                setFormValues({ ...formValues, ...initValues });
                setFormDataState({ ...formValues, ...initValues });
            }
        }

        return initValues;
    }

    const initValues = () => {
        // init values using formDataState and setFormDataState
        let initValues: any = {};
        formData.forEach((obj: any) => {
            if (obj.paramType === 'result') {
                obj.value = obj.value ? obj.value : true;
                initValues[obj.id] = obj.value ? obj.value : true;
                obj.resultParamValue = obj.resultParamValue ? obj.resultParamValue : '';
                initValues[`resultParamValue${obj.id}`] = obj.resultParamValue ? obj.resultParamValue : '';
            }
            else initValues[obj.id] = obj.value ? obj.value : '';
        });

        initValues[`addinst${node?.data.id}`] = node?.data.additionalInstructions ? node?.data.additionalInstructions : '';
        return initValues;
    }

    const updateFormikValues = (node: any) => {

        let newValues : any = {};
        let formData = node.data.formData;
        formData.forEach((obj: any) => {

            if (obj.paramType === 'result') {
                newValues[obj.id] = obj.value;
                newValues[`resultParamValue${obj.id}`] = obj.resultParamValue;
            }
            else newValues[obj.id] = obj.value;
        });

        newValues[`addinst${node?.data.id}`] = node?.data.additionalInstructions ? node?.data.additionalInstructions : '';

        formik.setValues({...formik.values, ...newValues});
    }

    const copyFormikValuesToNodeData = (values: any) => {
        
        formData.forEach((obj: any) => {
            obj.value = values[obj.id];
            if (obj.paramType === 'result') {
                obj.resultParamValue = values[`resultParamValue${obj.id}`];
            }
        });
        nodeData.additionalInstructions = values[`addinst${node?.data.id}`];

        setFormDataState([...formData]);
    }

    const resetValues = () => {
        formData.forEach((obj: any) => {
            obj.value = '';
        });
        nodeData.additionalInstructions = '';
    }

    const resetFormikValues = (values: any) => {
        let initValues: any = {};
        formData.forEach((obj: any) => {
            if (obj.paramType === 'result') {
                obj.value = true;
                obj.resultParamValue = "";
                initValues[obj.id] = true;
                initValues[`resultParamValue${obj.id}`] = "";
            }
            else {
                obj.value = '';
                initValues[obj.id] = '';
            }
        });

        initValues[`addinst${node?.data.id}`] = '';
        values = initValues;
    }

    const validate = (values: any) => {

        let errors: any = {};
        // loop over values and check if they are empty
        for (let key in values) {
            if ((values[key] === '' || values[key] === undefined || values[key] === null)) {
                // if key is an id of a param in formdata, then it is a required field
                if (formData.find((obj: any) => obj.id === key)) errors[key] = 'Required';
            }
        }

        return errors;
    };

    // execute getInitValues on change to activeComponentId in CanvasContext

    const formik = useFormik({
        initialValues: initValues(),
        enableReinitialize: true,
        validate: validate,
        onSubmit: (values: any) => {
            copyFormikValuesToNodeData(values);
        },
    });

    useEffect(() => {
        setNode(props.activeNode);
        updateFormikValues(props.activeNode);
        change = true;
        setDataChange(true);
    }, [props.activeNode]);

    useEffect(() => {
        setFormData(nodeData.formData);
        setDataChange(!dataChange);
        console.log('validating form');
        //formik.validateForm();
    }, [nodeData.formData]);

    useEffect(() => {
        setDataChange(true);
    }, [formik.values]);

    useEffect(() => {
        formik.validateForm();
        setDataChange(false);
    }, [dataChange]);

    

    return (
        <div>
            <h1>
                {nodeData.name}
            </h1>
            <h2>
                Parameters
            </h2>
            <div>
                <div className='formik-errors'>
                    <ul style={{background: 'pink'}}>
                        {
                            Object.keys(formik.errors).map((key: any) => {
                                return (
                                    <li key={key}>
                                        {key}: {formik.errors[key]}
                                    </li>
                                )
                            })
                        }
                    </ul>
                </div>
                <form onSubmit={formik.handleSubmit}>
                    <div className='input-params'>
                        {
                            formData.map((param: any) => {
                                if (param.paramType !== 'result') {
                                    return (
                                        <div key={param.id}>
                                            <label>
                                                {param.name}
                                            </label>
                                            <input type={param.paramType} value={formik.values[param.id] ? formik.values[param.id] : ""} name={param.id} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                                        </div>
                                    )
                                }
                            })
                        }
                    </div>
                    <div className="result-parms">
                        {
                            formData.map((param: any) => {
                                if (param.paramType === 'result') {
                                    return (
                                        
                                        <div key={param.id}>
                                            <label>
                                                {param.name}
                                            </label>
                                            <input 
                                                type="checkbox"
                                                checked={formik.values[param.id]}
                                                onChange={formik.handleChange}
                                                name={param.id}
                                            />
                                            {
                                                // add input if not checked
                                                !formik.values[param.id] &&
                                                <div>
                                                    <label>
                                                        Result Alternative
                                                    </label>
                                                    <input type={param.paramType} value={formik.values[`resultParamValue${param.id}`] ? formik.values[`resultParamValue${param.id}`] : ""} name={`resultParamValue${param.id}`} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                                                </div>
                                            }
                                        </div>
                                    )
                                }
                            })
                        }
                    </div>
                    <div className="add-instructs">
                        <label htmlFor="add">Additional Instructions</label>
                        <input id="add" name={`addinst${node?.data.id}`} type="text" onChange={formik.handleChange} onBlur={formik.handleBlur} value={formik.values[`addinst${node?.data.id}`]} />
                    </div>

                    <button type="submit" disabled={ Object.keys(formik.errors).length !== 0}>Submit</button>
                </form>
            </div>
        </div>
    )
}
