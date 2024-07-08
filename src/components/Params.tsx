import React, { useEffect, useState } from 'react';
import { useFormik, } from 'formik';
import { FormControl, FormHelperText, IconButton, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';


interface ParamFormProps {
    activeNode: any;  // Replace 'any' with the appropriate type for activeNode
}


export default function ({ activeNode }: ParamFormProps) {
    const [paramErrors, setParamErrors]: any = useState([]);

    // init formik with values from activeNode
    const initValues = () => {
        // init values using formDataState and setFormDataState
        let initValues: any = {};
        activeNode.data.formData.forEach((obj: any) => {
            if (obj.paramType === 'result') {
                obj.value            = obj.value !== null   ? obj.value            : true;
                initValues[obj.id]   = obj.value !== null   ? obj.value            : true;
                obj.resultParamValue = obj.resultParamValue ? obj.resultParamValue : '';
                initValues[`resultParamValue${obj.id}`] = obj.resultParamValue ? obj.resultParamValue : '';
            }
            else initValues[obj.id] = obj.value ? obj.value : '';
        });
        // Now a dedicated field in each service (should always accompany other params)
        // initValues[`addinst${activeNode?.data.id}`] = activeNode?.data.additionalInstructions ? activeNode?.data.additionalInstructions : '';
        
        return initValues;
    }

    // validation function for formik to check for empty fields
    const validate = (values: any) => {
        let errors: any = {};
        // loop over values and check if they are empty
        for (let key in values) {
            if ((values[key] === '' || values[key] === undefined || values[key] === null)) {
                // if key is an id of a param in formdata, then it is a required field
                if (activeNode.data.formData.find((obj: any) => obj.id === key)) errors[key] = 'Required';
            }
        }
        setParamErrors(errors);
        return errors;
    };

    // copy formik values to activeNode.data
    const copyFormikValuesToNodeData = (values: any) => {
        activeNode.data.formData.forEach((obj: any) => {
            obj.value = values[obj.id];
            if (obj.paramType === 'result') {
                obj.resultParamValue = values[`resultParamValue${obj.id}`];
            }
        });
        // Now a dedicated field in each service (should always accompany other params)
        // activeNode.data.additionalInstructions = values[`addinst${activeNode?.data.id}`];
    }

    // formik hook init
    const formik = useFormik({
        initialValues     : initValues(),
        enableReinitialize: true,
        validate          : validate,
        onSubmit: (values: any) => {
            copyFormikValuesToNodeData(values);
        },
    });

    // update values to active node form data and validate
    useEffect(() => {
        copyFormikValuesToNodeData(formik.values);
        const errors = validate(formik.values);
        if (Object.keys(errors).length > 0) {
            formik.setErrors(errors);
        };
        if (Object(errors).length != paramErrors.length) {
            setParamErrors(errors);
        };
    }, [formik.values]);

    return (
        <div>
            <h3>
                Parameters
            </h3>
            <div className='formik-errors' style={{marginLeft: 20}}>
                <ul style={{ background: 'pink', fontSize: 10 }}>
                    {
                        Object.keys(paramErrors).map((key: any) => {
                            let name = activeNode.data.formData.find((obj: any) => obj.id === key)?.name;
                            return (
                                <li key={key} style={{ position: 'relative', left: -25 }}>
                                    {name}: {paramErrors[key]}
                                </li>
                            )
                        })
                    }
                </ul>
            </div>
            <form onSubmit={formik.handleSubmit}>
                <div className='input-params' style={{marginLeft: 20}}>
                    {
                        activeNode.data.formData.map((param: any) => {
                            if (param.paramType !== 'result') {
                                if (param.type === "dropdown") {
                                    return (
                                        <FormControl size='small' sx={{ mt: 3, width: '26ch' }} key={param.id}>
                                            <InputLabel>{param.name}</InputLabel>
                                            <Select
                                                name     = {param.id}
                                                value    = {formik.values[param.id] ? formik.values[param.id] : ""}
                                                onChange = {formik.handleChange}
                                                onBlur   = {formik.handleBlur}
                                            >
                                                {param.options.map((option: any) => (
                                                    <MenuItem key={option.id} value={option.id}>
                                                        {option.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            <FormHelperText>{param.description ? param.description : null}</FormHelperText>
                                        </FormControl>
                                    );
                                } else {
                                    return (
                                        <TextField
                                            multiline  = {param.name === 'Additional Notes' ? true : false}
                                            helperText = {param.description ? param.description : null}
                                            size       = 'small'
                                            key        = {param.id}
                                            label      = {param.name}
                                            type       = {param.type}
                                            value      = {formik.values[param.id] ? formik.values[param.id] : ""}
                                            name       = {param.id}
                                            onChange   = {formik.handleChange}
                                            onBlur     = {formik.handleBlur}
                                            sx         = {{ mt: 3, width: '26ch' }}
                                        />
                                    );
                                }
                            }
                        })
                    }
                </div>
                <div className="result-parms" style={{marginLeft: 20}}>
                    {
                        // check if there are any result params and display info if there are
                        activeNode.data.formData.find((obj: any) => obj.paramType === 'result') &&
                        <div>
                            Result Parameters
                            <IconButton onClick={() => {
                                alert('Result parameteres are results of experiments that were previously run in the workflow. By default we will use their outputs, if you would like to specify a different input, you can deselect and enter what we should use.')
                            }}>
                                <InfoOutlinedIcon />
                            </IconButton>

                        </div>
                    }
                    {
                        activeNode.data.formData.map((param: any) => {
                            if (param.paramType === 'result') {
                                return (

                                    <div key={param.id}>
                                        <label>
                                            {param.name}
                                        </label>
                                        <input
                                            type     = "checkbox"
                                            checked  = {formik.values[param.id]}
                                            onChange = {formik.handleChange}
                                            name     = {param.id}
                                        />
                                        {
                                            // add input if not checked      
                                            !formik.values[param.id] &&
                                            <div>
                                                <label>
                                                    Result Alternative
                                                </label>
                                                <input type={param.type} 
                                                value={formik.values[`resultParamValue${param.id}`] 
                                                     ? formik.values[`resultParamValue${param.id}`] 
                                                     : null} 
                                                name     = {`resultParamValue${param.id}`}
                                                onChange = {formik.handleChange}
                                                onBlur   = {formik.handleBlur} />
                                            </div>
                                        }
                                    </div>
                                )
                            }
                        })
                    }
                </div>
                {/* Now a dedicated field in each service (should always accompany other params) */}
                {/* <div className="add-instructs" style={{marginLeft: 20, marginBottom: 10}}>
                    <TextField multiline sx={{ mt: 3, width: '26ch' }} label="Additional Instructions" rows={3}
                    value={formik.values[`addinst${activeNode?.data.id}`] 
                         ? formik.values[`addinst${activeNode?.data.id}`] 
                         : ""} 
                    name     = {`addinst${activeNode?.data.id}`}
                    onChange = {formik.handleChange}
                    onBlur   = {formik.handleBlur} />
                </div> */}
            </form>
        </div>
    )
}
