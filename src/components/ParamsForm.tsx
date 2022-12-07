import React from 'react';
import { Formik } from 'formik';
import { Button } from '@mui/material';
import { CanvasContext } from '../contexts/Canvas';
export default function (props: any) {

    const val = React.useContext(CanvasContext);
    const node = props.activeNode;
    const nodeData = props.activeNode.data;
    const formData = nodeData.formData;

    const getInitValues = () => {
        let initValues: any = {};
        formData.forEach((obj: any) => {
            initValues[obj.id] = obj.value ? obj.value : '';
        });
        initValues[`addinst${node?.data.id}`] = node?.data.additionalInstructions ? node?.data.additionalInstructions : '';
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
            obj.value = '';
            initValues[obj.id] = '';
        });
        initValues[`addinst${node?.data.id}`] = '';
        values = initValues;
    }

    return (
        <div>
            <h1>
                {nodeData.name}
            </h1>
            <h2>
                Parameters
            </h2>
            <Formik initialValues={getInitValues()} onSubmit={(values, { setSubmitting, resetForm }) => {
                setSubmitting(true);
                copyFormikValuesToNodeData(values);
                console.log(node);
                console.log(formData);
                setSubmitting(false);
            }}>
                {({ values, handleChange, handleBlur, handleSubmit, handleReset, resetForm }) => (
                    <form onSubmit={handleSubmit}>
                        {
                            formData.map((param: any) => {
                                return (
                                    <div key={param.id}>
                                        <label>
                                            {param.name}
                                        </label>
                                        <input type="text" value={values[param.id] ? values[param.id] : ""} name={param.id} onChange={handleChange} onBlur={handleBlur} />
                                    </div>
                                )
                            })
                        }
                        <div>
                            <label>
                                Additional Instructions
                            </label>
                            <textarea value={values[`addinst${node?.data.id}`] ? values[`addinst${node?.data.id}`]: ""} name={`addinst${node?.data.id}`} onChange={handleChange} onBlur={handleBlur}  />
                        </div>
                        <div>
                        <Button type="button" onClick={ () => resetForm({values: ''}) }>
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
