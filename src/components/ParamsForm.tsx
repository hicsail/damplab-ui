import React, { useRef, useState, useEffect, useContext, useMemo } from 'react';
import { Formik, useFormik } from 'formik';
import { Button, Checkbox } from '@mui/material';
import { CanvasContext } from '../contexts/Canvas';
export default function (props: any) {

    const val = React.useContext(CanvasContext);
    const node = props.activeNode;
    const nodeData = props.activeNode.data;
    const formData = nodeData.formData;
    const formRef = useRef();
    const [formValues, setFormValues] = useState<any>({});


    const getInitValues = () => {

        let initValues: any = formValues;
        formData.forEach((obj: any) => {



            if (obj.paramType === 'result') {
                initValues[obj.id] = obj.value ? obj.value : true;
                obj.value = obj.value ? obj.value : true;
            }
            else initValues[obj.id] = obj.value ? obj.value : '';
            //setValuesInitiated([...valuesInitiated, obj.id]);


        });

        initValues[`addinst${node?.data.id}`] = node?.data.additionalInstructions ? node?.data.additionalInstructions : '';
        // append initValues to formValues if initValues is not in formValues
        for (let key in initValues) {
            if (!(key in formValues)) {
                setFormValues({ ...formValues, ...initValues });
            }
        }
        
        return initValues;
    }

    const copyFormikValuesToNodeData = (values: any) => {
        formData.forEach((obj: any) => {
            obj.value = values[obj.id];
        });
        nodeData.additionalInstructions = values[`addinst${node?.data.id}`];
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
                initValues[obj.id] = true;
            }
            else {
                obj.value = '';
                initValues[obj.id] = '';
            }
        });

        initValues[`addinst${node?.data.id}`] = '';
        values = initValues;
    }

    // execute getInitValues on change to activeComponentId in CanvasContext
    useEffect(() => {
        getInitValues();
    }, [val.activeComponentId]);

    return (
        <div>
            <h1>
                {nodeData.name}
            </h1>
            <h2>
                Parameters
            </h2>
            <Formik initialValues={getInitValues()} enableReinitialize={true} onSubmit={(values, { setSubmitting, resetForm }) => {
                setSubmitting(true);
                copyFormikValuesToNodeData(values);
                setSubmitting(false);
            }}>
                {({ values, handleChange, handleBlur, handleSubmit, handleReset, resetForm }) => (
                    <form onSubmit={handleSubmit}>
                        {
                            formData.map((param: any) => {
                                param.paramType = param.paramType ? param.paramType : 'text';
                                
                                if (param.paramType === 'result') {
                                    console.log(values[param.id]);
                                    return (
                                        <div key={param.id}>
                                            <label>
                                                {param.name}
                                            </label>
                                            <Checkbox checked={values[param.id]} name={param.id} onChange={handleChange} onBlur={handleBlur} />
                                            {
                                                !values[param.id] ? <div>
                                                    <label>
                                                        Alternate to use
                                                    </label>
                                                    <input type="text" value={values[param.id] ? values[param.id] : ""} name={param.id} onChange={handleChange} onBlur={handleBlur} />
                                                </div> : null
                                            }
                                        </div>
                                    )
                                }
                                else {
                                    return (
                                        <div key={param.id}>
                                            <label>
                                                {param.name}
                                            </label>
                                            <input type="text" value={values[param.id] ? values[param.id] : ""} name={param.id} onChange={handleChange} onBlur={handleBlur} />
                                        </div>
                                    )
                                }
                            })
                        }
                        <div>
                            <label>
                                Additional Instructions
                            </label>
                            <textarea value={values[`addinst${node?.data.id}`] ? values[`addinst${node?.data.id}`] : ""} name={`addinst${node?.data.id}`} onChange={handleChange} onBlur={handleBlur} />
                        </div>
                        <div>
                            <Button type="button" onClick={() => resetForm({ values: '' })}>
                                Reset Changes
                            </Button>
                            <Button type="submit">
                                Submit
                            </Button>
                        </div>

                    </form>
                )}
            </Formik>
        </div>
    )
}
